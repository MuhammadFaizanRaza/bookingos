import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Plan } from '@bookingos/database';
import { PrismaService } from '../../database/prisma.service';
import { StripeService } from '../../stripe/stripe.service';

/** Per-plan usage limits. Keep in sync with apps/web/src/lib/plans.ts */
export const PLAN_LIMITS: Record<Plan, { maxStaff: number; maxLocations: number }> = {
  STARTER: { maxStaff: 3, maxLocations: 1 },
  PRO: { maxStaff: 15, maxLocations: 3 },
  BUSINESS: { maxStaff: Number.MAX_SAFE_INTEGER, maxLocations: Number.MAX_SAFE_INTEGER },
};

@Injectable()
export class BillingService {
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    config: ConfigService,
  ) {
    this.appUrl =
      config.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000';
  }

  /** Returns the current subscription + tenant billing status. */
  async getStatus(tenantId: string) {
    const tenant = await this.prisma.client.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: { subscription: true },
    });
    return {
      status: tenant.status,
      plan: tenant.plan,
      trialEndsAt: tenant.trialEndsAt,
      subscription: tenant.subscription,
      hasStripeCustomer: Boolean(tenant.stripeCustomerId),
    };
  }

  /** Returns current resource usage vs the plan's limits (for the dashboard). */
  async getUsage(tenantId: string) {
    const tenant = await this.prisma.client.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: { subscription: true },
    });
    const [staff, locations] = await Promise.all([
      this.prisma.client.staffProfile.count({ where: { tenantId } }),
      this.prisma.client.location.count({ where: { tenantId } }),
    ]);
    const limits = PLAN_LIMITS[tenant.plan];
    return {
      plan: tenant.plan,
      status: tenant.status,
      staff: { used: staff, limit: limits.maxStaff },
      locations: { used: locations, limit: limits.maxLocations },
      currentPeriodEnd: tenant.subscription?.currentPeriodEnd ?? null,
    };
  }

  /** Creates (or reuses) a Stripe customer and a Checkout session for a plan. */
  async createCheckout(tenantId: string, plan: Plan) {
    const tenant = await this.prisma.client.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: { users: { where: { role: 'OWNER' }, take: 1 } },
    });

    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.client.customers.create({
        name: tenant.name,
        email: tenant.users[0]?.email,
        metadata: { tenantId },
      });
      customerId = customer.id;
      await this.prisma.client.tenant.update({
        where: { id: tenantId },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await this.stripe.client.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: this.stripe.priceIdForPlan(plan), quantity: 1 }],
      success_url: `${this.appUrl}/billing?success=1`,
      cancel_url: `${this.appUrl}/billing?canceled=1`,
      metadata: { tenantId, plan },
      subscription_data: { metadata: { tenantId } },
    });

    return { url: session.url, sessionId: session.id };
  }

  /** Creates a Stripe Billing customer-portal link. */
  async createPortal(tenantId: string) {
    const tenant = await this.prisma.client.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });
    if (!tenant.stripeCustomerId) {
      throw new Error('No Stripe customer for this tenant');
    }
    const session = await this.stripe.client.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${this.appUrl}/billing`,
    });
    return { url: session.url };
  }
}
