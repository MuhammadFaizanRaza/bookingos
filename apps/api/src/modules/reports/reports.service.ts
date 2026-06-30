import { Injectable } from '@nestjs/common';
import { Prisma, SaleStatus } from '@bookingos/database';
import { PrismaService } from '../../database/prisma.service';
import { TenantService } from '../../database/tenant.service';
import { add, dec } from '../../common/money';
import { Bucket } from './dto/report-query.dto';

interface Range {
  from: Date;
  to: Date;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly tenants: TenantService,
    private readonly prisma: PrismaService,
  ) {}

  // ---- Revenue over time (raw SQL date bucketing) -------------------------

  async revenueOverTime(tenantId: string, bucket: Bucket, range: Range) {
    const trunc =
      bucket === 'month' ? 'month' : bucket === 'week' ? 'week' : 'day';
    // Parameterised raw query; tenantId is bound, never interpolated.
    const rows = await this.prisma.client.$queryRaw<
      { bucket: Date; revenue: Prisma.Decimal; sales: bigint }[]
    >(Prisma.sql`
      SELECT date_trunc(${trunc}, "createdAt") AS bucket,
             COALESCE(SUM("total"), 0)         AS revenue,
             COUNT(*)                          AS sales
      FROM "Sale"
      WHERE "tenantId" = ${tenantId}
        AND "status" IN ('PAID', 'PARTIALLY_REFUNDED')
        AND "createdAt" BETWEEN ${range.from} AND ${range.to}
      GROUP BY 1
      ORDER BY 1 ASC
    `);
    return rows.map((r) => ({
      bucket: r.bucket,
      revenue: dec(r.revenue).toNumber(),
      sales: Number(r.sales),
    }));
  }

  // ---- Revenue by service -------------------------------------------------

  async revenueByService(tenantId: string, range: Range) {
    const rows = await this.prisma.client.$queryRaw<
      { serviceId: string | null; name: string; revenue: Prisma.Decimal; qty: bigint }[]
    >(Prisma.sql`
      SELECT si."refId" AS "serviceId",
             si."name"  AS name,
             COALESCE(SUM(si."total"), 0) AS revenue,
             COALESCE(SUM(si."quantity"), 0) AS qty
      FROM "SaleItem" si
      JOIN "Sale" s ON s."id" = si."saleId"
      WHERE s."tenantId" = ${tenantId}
        AND si."type" = 'SERVICE'
        AND s."status" IN ('PAID', 'PARTIALLY_REFUNDED')
        AND s."createdAt" BETWEEN ${range.from} AND ${range.to}
      GROUP BY 1, 2
      ORDER BY revenue DESC
    `);
    return rows.map((r) => ({
      serviceId: r.serviceId,
      name: r.name,
      revenue: dec(r.revenue).toNumber(),
      quantity: Number(r.qty),
    }));
  }

  // ---- Revenue by staff ---------------------------------------------------

  async revenueByStaff(tenantId: string, range: Range) {
    const rows = await this.prisma.client.$queryRaw<
      { staffId: string | null; name: string | null; revenue: Prisma.Decimal }[]
    >(Prisma.sql`
      SELECT si."staffId" AS "staffId",
             u."name"     AS name,
             COALESCE(SUM(si."total"), 0) AS revenue
      FROM "SaleItem" si
      JOIN "Sale" s ON s."id" = si."saleId"
      LEFT JOIN "StaffProfile" sp ON sp."id" = si."staffId"
      LEFT JOIN "User" u ON u."id" = sp."userId"
      WHERE s."tenantId" = ${tenantId}
        AND s."status" IN ('PAID', 'PARTIALLY_REFUNDED')
        AND s."createdAt" BETWEEN ${range.from} AND ${range.to}
      GROUP BY 1, 2
      ORDER BY revenue DESC
    `);
    return rows.map((r) => ({
      staffId: r.staffId,
      name: r.name,
      revenue: dec(r.revenue).toNumber(),
    }));
  }

  // ---- Appointments by status --------------------------------------------

  async appointmentsByStatus(tenantId: string, range: Range) {
    const grouped = await this.tenants.getClient(tenantId).appointment.groupBy({
      by: ['status'],
      where: { startsAt: { gte: range.from, lte: range.to } },
      _count: { _all: true },
    });
    return grouped.map((g) => ({ status: g.status, count: g._count._all }));
  }

  // ---- Top clients --------------------------------------------------------

  async topClients(tenantId: string, range: Range, limit = 10) {
    const rows = await this.prisma.client.$queryRaw<
      { clientId: string; name: string; revenue: Prisma.Decimal; visits: bigint }[]
    >(Prisma.sql`
      SELECT c."id" AS "clientId",
             c."name" AS name,
             COALESCE(SUM(s."total"), 0) AS revenue,
             COUNT(s."id") AS visits
      FROM "Sale" s
      JOIN "Client" c ON c."id" = s."clientId"
      WHERE s."tenantId" = ${tenantId}
        AND s."status" IN ('PAID', 'PARTIALLY_REFUNDED')
        AND s."createdAt" BETWEEN ${range.from} AND ${range.to}
      GROUP BY 1, 2
      ORDER BY revenue DESC
      LIMIT ${limit}
    `);
    return rows.map((r) => ({
      clientId: r.clientId,
      name: r.name,
      revenue: dec(r.revenue).toNumber(),
      visits: Number(r.visits),
    }));
  }

  // ---- Occupancy / utilization -------------------------------------------

  /**
   * Utilization = booked minutes / available (working) minutes per staff in
   * the range. Available minutes are derived from each staff member's weekly
   * WorkingHours expanded over the range's days (minus nothing here — a simple,
   * defensible model for a dashboard KPI).
   */
  async utilization(tenantId: string, range: Range) {
    const db = this.tenants.getClient(tenantId);
    const staff = await db.staffProfile.findMany({
      where: { isBookable: true },
      include: {
        user: { select: { name: true } },
        workingHours: true,
      },
    });

    const days = this.eachDay(range.from, range.to);

    const results = [];
    for (const s of staff) {
      const availableMin = days.reduce((acc, day) => {
        const dow = day.getUTCDay();
        const todays = s.workingHours.filter((h) => h.dayOfWeek === dow);
        return (
          acc + todays.reduce((a, h) => a + (h.endMin - h.startMin), 0)
        );
      }, 0);

      const items = await db.appointmentItem.findMany({
        where: {
          staffId: s.id,
          startsAt: { gte: range.from, lte: range.to },
          appointment: { status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
        },
        select: { durationMin: true },
      });
      const bookedMin = items.reduce((a, i) => a + i.durationMin, 0);

      results.push({
        staffId: s.id,
        name: s.user.name,
        availableMin,
        bookedMin,
        utilization:
          availableMin > 0
            ? Number(((bookedMin / availableMin) * 100).toFixed(1))
            : 0,
      });
    }
    return results;
  }

  // ---- Low stock ----------------------------------------------------------

  async lowStock(tenantId: string) {
    const products = await this.tenants
      .getClient(tenantId)
      .product.findMany({ where: { isActive: true } });
    return products
      .filter((p) => p.stockQty <= p.lowStockAt)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stockQty: p.stockQty,
        lowStockAt: p.lowStockAt,
      }));
  }

  // ---- Average rating -----------------------------------------------------

  async averageRating(tenantId: string) {
    const db = this.tenants.getClient(tenantId);
    const agg = await db.review.aggregate({
      _avg: { rating: true },
      _count: { _all: true },
    });
    const byStaff = await db.review.groupBy({
      by: ['staffId'],
      _avg: { rating: true },
      _count: { _all: true },
    });
    return {
      overall: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : null,
      totalReviews: agg._count._all,
      byStaff: byStaff.map((g) => ({
        staffId: g.staffId,
        average: g._avg.rating ? Number(g._avg.rating.toFixed(2)) : null,
        count: g._count._all,
      })),
    };
  }

  // ---- Summary (dashboard KPIs) ------------------------------------------

  async summary(tenantId: string, range: Range) {
    const db = this.tenants.getClient(tenantId);
    const [sales, appts, newClients] = await Promise.all([
      db.sale.findMany({
        where: {
          status: { in: [SaleStatus.PAID, SaleStatus.PARTIALLY_REFUNDED] },
          createdAt: { gte: range.from, lte: range.to },
        },
        select: { total: true },
      }),
      db.appointment.count({
        where: { startsAt: { gte: range.from, lte: range.to } },
      }),
      db.client.count({
        where: { createdAt: { gte: range.from, lte: range.to } },
      }),
    ]);
    const revenue = sales.reduce((acc, s) => add(acc, s.total), dec(0));
    return {
      revenue: revenue.toNumber(),
      sales: sales.length,
      appointments: appts,
      newClients,
      averageTicket:
        sales.length > 0 ? Number(revenue.div(sales.length).toFixed(2)) : 0,
    };
  }

  // ---- helpers ------------------------------------------------------------

  private eachDay(from: Date, to: Date): Date[] {
    const out: Date[] = [];
    const cur = new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
    );
    const end = new Date(
      Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()),
    );
    while (cur <= end) {
      out.push(new Date(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return out;
  }
}
