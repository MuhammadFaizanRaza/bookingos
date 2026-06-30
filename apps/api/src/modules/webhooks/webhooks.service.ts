import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentStatus,
  Plan,
  SaleStatus,
  SubscriptionStatus,
  TenantStatus,
} from '@salonos/database';
import type Stripe from 'stripe';
import { PrismaService } from '../../database/prisma.service';
import { StripeService } from '../../stripe/stripe.service';
import { dec, money } from '../../common/money';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  /**
   * Verifies the signature, dedupes via the WebhookEvent table, then routes the
   * event. Returns quickly with { received, duplicate } for the HTTP response.
   */
  async handle(payload: Buffer, signature: string) {
    const event = this.stripe.constructEvent(payload, signature);

    // Idempotency: record the event id; skip if already processed.
    const existing = await this.prisma.client.webhookEvent.findUnique({
      where: { id: event.id },
    });
    if (existing) {
      return { received: true, duplicate: true };
    }
    await this.prisma.client.webhookEvent.create({
      data: {
        id: event.id,
        type: event.type,
        payload: event as unknown as object,
      },
    });

    try {
      await this.route(event);
    } catch (err) {
      this.logger.error(`Failed handling ${event.type}`, err as Error);
      throw err;
    }
    return { received: true, duplicate: false };
  }

  private async route(event: Stripe.Event) {
    switch (event.type) {
      case 'payment_intent.succeeded':
        return this.onPaymentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
      case 'charge.refunded':
        return this.onChargeRefunded(event.data.object as Stripe.Charge);
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        return this.onSubscriptionChange(
          event.data.object as Stripe.Subscription,
          event.type === 'customer.subscription.deleted',
        );
      default:
        this.logger.debug(`Unhandled event ${event.type}`);
    }
  }

  private async onPaymentSucceeded(pi: Stripe.PaymentIntent) {
    const payment = await this.prisma.client.payment.findUnique({
      where: { stripePaymentIntentId: pi.id },
      include: { sale: true },
    });
    if (!payment) {
      this.logger.warn(`No payment for intent ${pi.id}`);
      return;
    }
    await this.prisma.client.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCEEDED,
        receiptUrl:
          typeof pi.latest_charge === 'object' && pi.latest_charge
            ? (pi.latest_charge.receipt_url ?? undefined)
            : undefined,
      },
    });

    if (payment.saleId) {
      await this.maybeSettleSale(payment.tenantId, payment.saleId);
    }
  }

  private async onChargeRefunded(charge: Stripe.Charge) {
    const piId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (!piId) return;
    const payment = await this.prisma.client.payment.findUnique({
      where: { stripePaymentIntentId: piId },
    });
    if (!payment) return;

    const refunded = money(dec(charge.amount_refunded).div(100));
    const fullyRefunded = charge.amount_refunded >= charge.amount;
    await this.prisma.client.payment.update({
      where: { id: payment.id },
      data: {
        refundedAmount: refunded,
        status: fullyRefunded
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED,
      },
    });

    if (payment.saleId) {
      await this.prisma.client.sale.update({
        where: { id: payment.saleId },
        data: {
          status: fullyRefunded
            ? SaleStatus.REFUNDED
            : SaleStatus.PARTIALLY_REFUNDED,
        },
      });
    }
  }

  private async onSubscriptionChange(
    sub: Stripe.Subscription,
    deleted: boolean,
  ) {
    const tenantId =
      sub.metadata?.tenantId ??
      (await this.tenantIdFromCustomer(sub.customer));
    if (!tenantId) {
      this.logger.warn(`No tenant for subscription ${sub.id}`);
      return;
    }

    const priceId = sub.items.data[0]?.price?.id;
    const plan = priceId ? this.stripe.planForPriceId(priceId) : null;
    const subStatus = this.mapSubStatus(sub.status, deleted);
    const tenantStatus = this.mapTenantStatus(sub.status, deleted);
    const periodEnd = this.currentPeriodEnd(sub);

    await this.prisma.client.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        plan: plan ?? Plan.STARTER,
        status: subStatus,
        stripeSubscriptionId: sub.id,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      },
      update: {
        status: subStatus,
        stripeSubscriptionId: sub.id,
        ...(plan ? { plan } : {}),
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      },
    });

    await this.prisma.client.tenant.update({
      where: { id: tenantId },
      data: { status: tenantStatus, ...(plan ? { plan } : {}) },
    });
  }

  /**
   * Reads the current period end across Stripe API versions: older versions
   * expose `current_period_end` on the subscription; newer ones move it onto
   * each subscription item.
   */
  private currentPeriodEnd(sub: Stripe.Subscription): Date | null {
    const raw = sub as unknown as {
      current_period_end?: number;
      items?: { data?: { current_period_end?: number }[] };
    };
    const epoch =
      raw.current_period_end ?? raw.items?.data?.[0]?.current_period_end;
    return epoch ? new Date(epoch * 1000) : null;
  }

  private async tenantIdFromCustomer(
    customer: string | Stripe.Customer | Stripe.DeletedCustomer,
  ): Promise<string | null> {
    const id = typeof customer === 'string' ? customer : customer.id;
    const tenant = await this.prisma.client.tenant.findUnique({
      where: { stripeCustomerId: id },
    });
    return tenant?.id ?? null;
  }

  private async maybeSettleSale(tenantId: string, saleId: string) {
    const sale = await this.prisma.client.sale.findUnique({
      where: { id: saleId },
      include: { payments: true },
    });
    if (!sale) return;
    const paid = sale.payments
      .filter((p) => p.status === PaymentStatus.SUCCEEDED)
      .reduce((acc, p) => acc.add(p.amount), dec(0));
    if (paid.greaterThanOrEqualTo(sale.total) && sale.total.greaterThan(0)) {
      await this.prisma.client.sale.update({
        where: { id: saleId },
        data: { status: SaleStatus.PAID },
      });
    }
  }

  private mapSubStatus(
    status: Stripe.Subscription.Status,
    deleted: boolean,
  ): SubscriptionStatus {
    if (deleted || status === 'canceled') return SubscriptionStatus.CANCELLED;
    switch (status) {
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
      case 'unpaid':
        return SubscriptionStatus.PAST_DUE;
      case 'incomplete':
      case 'incomplete_expired':
        return SubscriptionStatus.INCOMPLETE;
      default:
        return SubscriptionStatus.INCOMPLETE;
    }
  }

  private mapTenantStatus(
    status: Stripe.Subscription.Status,
    deleted: boolean,
  ): TenantStatus {
    if (deleted || status === 'canceled') return TenantStatus.CANCELLED;
    switch (status) {
      case 'trialing':
        return TenantStatus.TRIAL;
      case 'active':
        return TenantStatus.ACTIVE;
      case 'past_due':
      case 'unpaid':
        return TenantStatus.PAST_DUE;
      default:
        return TenantStatus.SUSPENDED;
    }
  }
}
