import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DiscountType,
  Prisma,
  SaleItemType,
  SaleStatus,
} from '@salonos/database';
import { TenantService } from '../../database/tenant.service';
import { add, dec, money, mul, nonNegative, sub } from '../../common/money';
import {
  AddItemsDto,
  ApplyDiscountDto,
  CreateSaleDto,
  SaleLineDto,
  SetTipTaxDto,
} from './dto/sale.dto';

@Injectable()
export class SalesService {
  constructor(private readonly tenants: TenantService) {}

  /** Create a sale ad-hoc or from an appointment, then compute totals. */
  async create(tenantId: string, dto: CreateSaleDto) {
    const db = this.tenants.getClient(tenantId);

    let lines: SaleLineDto[] = dto.items ?? [];
    let clientId = dto.clientId;
    let locationId = dto.locationId;
    const currency = 'USD';

    if (dto.appointmentId) {
      const appt = await db.appointment.findFirst({
        where: { id: dto.appointmentId },
        include: { items: { include: { service: true } } },
      });
      if (!appt) {
        throw new NotFoundException('Appointment not found');
      }
      const existingSale = await db.sale.findFirst({
        where: { appointmentId: appt.id },
      });
      if (existingSale) {
        throw new BadRequestException(
          'A sale already exists for this appointment',
        );
      }
      clientId = clientId ?? appt.clientId ?? undefined;
      locationId = locationId ?? appt.locationId ?? undefined;
      if (lines.length === 0) {
        lines = appt.items.map((i) => ({
          type: SaleItemType.SERVICE,
          refId: i.serviceId,
          name: i.service.name,
          quantity: 1,
          unitPrice: i.price.toNumber(),
          staffId: i.staffId ?? undefined,
        }));
      }
    }

    if (lines.length === 0) {
      throw new BadRequestException('A sale requires at least one item');
    }

    const built = await this.buildLines(tenantId, lines);
    const subtotal = built.reduce<Prisma.Decimal>(
      (acc, l) => add(acc, l.total),
      dec(0),
    );

    // `tenantId` is stamped automatically by the tenant-scoped client.
    return db.sale.create({
      data: {
        appointmentId: dto.appointmentId,
        clientId,
        locationId,
        status: SaleStatus.OPEN,
        currency,
        subtotal: money(subtotal),
        total: money(subtotal),
        items: { create: built },
      } as Prisma.SaleUncheckedCreateInput,
      include: this.include(),
    });
  }

  findAll(tenantId: string, status?: SaleStatus) {
    return this.tenants.getClient(tenantId).sale.findMany({
      where: status ? { status } : {},
      include: this.include(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const sale = await this.tenants
      .getClient(tenantId)
      .sale.findFirst({ where: { id }, include: this.include() });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    return sale;
  }

  async addItems(tenantId: string, id: string, dto: AddItemsDto) {
    const sale = await this.assertOpen(tenantId, id);
    const built = await this.buildLines(tenantId, dto.items);
    const db = this.tenants.getClient(tenantId);
    await db.saleItem.createMany({
      data: built.map((b) => ({ saleId: sale.id, ...b })),
    });
    return this.recompute(tenantId, id);
  }

  async removeItem(tenantId: string, id: string, itemId: string) {
    await this.assertOpen(tenantId, id);
    const db = this.tenants.getClient(tenantId);
    const result = await db.saleItem.deleteMany({
      where: { id: itemId, saleId: id },
    });
    if (result.count === 0) {
      throw new NotFoundException('Sale item not found');
    }
    return this.recompute(tenantId, id);
  }

  async applyDiscount(tenantId: string, id: string, dto: ApplyDiscountDto) {
    await this.assertOpen(tenantId, id);
    const db = this.tenants.getClient(tenantId);
    const discount = await db.discount.findFirst({
      where: { code: dto.code, isActive: true },
    });
    if (!discount) {
      throw new NotFoundException('Discount code not found');
    }
    const now = new Date();
    if (discount.validFrom && discount.validFrom > now) {
      throw new BadRequestException('Discount not yet valid');
    }
    if (discount.validUntil && discount.validUntil < now) {
      throw new BadRequestException('Discount expired');
    }
    if (
      discount.usageLimit != null &&
      discount.usageCount >= discount.usageLimit
    ) {
      throw new BadRequestException('Discount usage limit reached');
    }
    await db.sale.update({ where: { id }, data: { discountId: discount.id } });
    return this.recompute(tenantId, id);
  }

  async setTipTax(tenantId: string, id: string, dto: SetTipTaxDto) {
    await this.assertOpen(tenantId, id);
    return this.recompute(tenantId, id, dto.tip, dto.taxRate);
  }

  async void(tenantId: string, id: string) {
    await this.assertOpen(tenantId, id);
    return this.tenants.getClient(tenantId).sale.update({
      where: { id },
      data: { status: SaleStatus.VOID },
      include: this.include(),
    });
  }

  // ---- totals -------------------------------------------------------------

  /**
   * Recomputes subtotal → discount → tax → tip → total with Decimal math.
   * Tax is applied on the post-discount subtotal. Tip is added on top.
   */
  async recompute(
    tenantId: string,
    id: string,
    tip?: number,
    taxRatePercent?: number,
  ) {
    const db = this.tenants.getClient(tenantId);
    const sale = await db.sale.findFirst({
      where: { id },
      include: { items: true, discount: true },
    });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    const subtotal = sale.items.reduce<Prisma.Decimal>(
      (acc, i) => add(acc, i.total),
      dec(0),
    );

    let discountTotal = dec(0);
    if (sale.discount) {
      discountTotal =
        sale.discount.type === DiscountType.PERCENT
          ? mul(subtotal, dec(sale.discount.value).div(100))
          : dec(sale.discount.value);
      discountTotal = money(
        nonNegative(discountTotal.greaterThan(subtotal) ? subtotal : discountTotal),
      );
    }

    const taxable = nonNegative(sub(subtotal, discountTotal));
    const existingTaxRate =
      taxRatePercent != null
        ? dec(taxRatePercent)
        : sale.taxTotal.greaterThan(0) && taxable.greaterThan(0)
          ? mul(dec(sale.taxTotal).div(taxable), 100)
          : dec(0);
    const taxTotal = money(mul(taxable, existingTaxRate.div(100)));

    const tipTotal = money(tip != null ? dec(tip) : sale.tipTotal);
    const total = money(add(taxable, taxTotal, tipTotal));

    return db.sale.update({
      where: { id },
      data: {
        subtotal: money(subtotal),
        discountTotal,
        taxTotal,
        tipTotal,
        total,
      },
      include: this.include(),
    });
  }

  // ---- helpers ------------------------------------------------------------

  private async buildLines(tenantId: string, lines: SaleLineDto[]) {
    const db = this.tenants.getClient(tenantId);
    const out: {
      type: SaleItemType;
      refId?: string;
      name: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      total: Prisma.Decimal;
      staffId?: string;
    }[] = [];

    for (const line of lines) {
      let name = line.name;
      let unitPrice =
        line.unitPrice != null ? dec(line.unitPrice) : undefined;

      if (line.refId && (name == null || unitPrice == null)) {
        if (line.type === SaleItemType.SERVICE) {
          const svc = await db.service.findFirst({ where: { id: line.refId } });
          if (!svc) throw new BadRequestException(`Service ${line.refId} not found`);
          name = name ?? svc.name;
          unitPrice = unitPrice ?? dec(svc.price);
        } else {
          const prod = await db.product.findFirst({ where: { id: line.refId } });
          if (!prod) throw new BadRequestException(`Product ${line.refId} not found`);
          name = name ?? prod.name;
          unitPrice = unitPrice ?? dec(prod.price);
        }
      }

      if (name == null || unitPrice == null) {
        throw new BadRequestException(
          'Each line needs either a refId or both name and unitPrice',
        );
      }

      out.push({
        type: line.type,
        refId: line.refId,
        name,
        quantity: line.quantity,
        unitPrice: money(unitPrice),
        total: money(mul(unitPrice, line.quantity)),
        staffId: line.staffId,
      });
    }
    return out;
  }

  private async assertOpen(tenantId: string, id: string) {
    const sale = await this.findOne(tenantId, id);
    if (sale.status !== SaleStatus.OPEN) {
      throw new BadRequestException(`Sale is ${sale.status}, cannot modify`);
    }
    return sale;
  }

  private include(): Prisma.SaleInclude {
    return {
      items: true,
      client: { select: { id: true, name: true } },
      discount: true,
      payments: true,
    };
  }
}
