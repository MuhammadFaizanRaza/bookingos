import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMethod,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  SaleStatus,
} from '@salonos/database';
import type Stripe from 'stripe';
import { PrismaService } from '../../database/prisma.service';
import { TenantService } from '../../database/tenant.service';
import { StripeService } from '../../stripe/stripe.service';
import { add, dec, money, toMinorUnits } from '../../common/money';
import {
  CreatePaymentIntentDto,
  RecordCashPaymentDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly tenants: TenantService,
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  /**
   * Creates a Stripe PaymentIntent for a sale. If the tenant has a Stripe
   * Connect account, the charge is made on behalf of that account so funds
   * settle into the salon's balance (platform stays the merchant of record via
   * `transfer_data`/`on_behalf_of`). Otherwise a direct charge is created.
   */
  async createPaymentIntent(tenantId: string, dto: CreatePaymentIntentDto) {
    const db = this.tenants.getClient(tenantId);
    const sale = await db.sale.findFirst({
      where: { id: dto.saleId },
      include: { payments: true },
    });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    if (sale.status === SaleStatus.VOID) {
      throw new BadRequestException('Cannot charge a void sale');
    }

    const amount = dto.amount != null ? dec(dto.amount) : dec(sale.total);
    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Amount must be positive');
    }

    const tenant = await this.prisma.client.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });

    const params: Stripe.PaymentIntentCreateParams = {
      amount: toMinorUnits(amount),
      currency: (sale.currency ?? 'usd').toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: { tenantId, saleId: sale.id, purpose: 'SALE' },
    };

    let intent: Stripe.PaymentIntent;
    if (tenant.stripeAccountId) {
      // Destination charge: platform processes, transfers to the salon.
      intent = await this.stripe.client.paymentIntents.create({
        ...params,
        on_behalf_of: tenant.stripeAccountId,
        transfer_data: { destination: tenant.stripeAccountId },
      });
    } else {
      intent = await this.stripe.client.paymentIntents.create(params);
    }

    const payment = await db.payment.create({
      // `tenantId` is stamped automatically by the tenant-scoped client.
      data: {
        saleId: sale.id,
        purpose: PaymentPurpose.SALE,
        method: PaymentMethod.CARD,
        status: PaymentStatus.PENDING,
        amount: money(amount),
        currency: sale.currency,
        stripePaymentIntentId: intent.id,
      } as Prisma.PaymentUncheckedCreateInput,
    });

    return {
      paymentId: payment.id,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amount: money(amount).toNumber(),
      currency: sale.currency,
    };
  }

  /** Records a cash payment and marks the sale PAID once fully covered. */
  async recordCash(tenantId: string, dto: RecordCashPaymentDto) {
    const db = this.tenants.getClient(tenantId);
    const sale = await db.sale.findFirst({
      where: { id: dto.saleId },
      include: { payments: true },
    });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    const payment = await db.payment.create({
      // `tenantId` is stamped automatically by the tenant-scoped client.
      data: {
        saleId: sale.id,
        purpose: PaymentPurpose.SALE,
        method: PaymentMethod.CASH,
        status: PaymentStatus.SUCCEEDED,
        amount: money(dec(dto.amount)),
        currency: sale.currency,
      } as Prisma.PaymentUncheckedCreateInput,
    });

    await this.settleSaleIfPaid(tenantId, sale.id);
    return payment;
  }

  findAll(tenantId: string, saleId?: string) {
    return this.tenants.getClient(tenantId).payment.findMany({
      where: saleId ? { saleId } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Marks the sale PAID if successful payments cover the total. */
  async settleSaleIfPaid(tenantId: string, saleId: string) {
    const db = this.tenants.getClient(tenantId);
    const sale = await db.sale.findFirst({
      where: { id: saleId },
      include: { payments: true },
    });
    if (!sale) return;
    const paid = sale.payments
      .filter((p) => p.status === PaymentStatus.SUCCEEDED)
      .reduce<Prisma.Decimal>((acc, p) => add(acc, p.amount), dec(0));
    if (paid.greaterThanOrEqualTo(sale.total) && sale.total.greaterThan(0)) {
      await db.sale.update({
        where: { id: saleId },
        data: { status: SaleStatus.PAID },
      });
    }
  }
}
