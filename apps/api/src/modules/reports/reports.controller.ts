import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@bookingos/database';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentTenant } from '../../tenant/current-tenant.decorator';
import { ReportsService } from './reports.service';
import { DateRangeQueryDto, RevenueQueryDto } from './dto/report-query.dto';

@ApiTags('reports')
@ApiBearerAuth()
@Roles(Role.OWNER, Role.MANAGER)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  private range(from?: string, to?: string) {
    const now = new Date();
    const defFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      from: from ? new Date(`${from}T00:00:00.000Z`) : defFrom,
      to: to ? new Date(`${to}T23:59:59.999Z`) : now,
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Dashboard KPIs (revenue, sales, appts, clients)' })
  summary(@CurrentTenant() tenantId: string, @Query() q: DateRangeQueryDto) {
    return this.reports.summary(tenantId, this.range(q.from, q.to));
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue over time (day/week/month buckets)' })
  revenue(@CurrentTenant() tenantId: string, @Query() q: RevenueQueryDto) {
    return this.reports.revenueOverTime(
      tenantId,
      q.bucket ?? 'day',
      this.range(q.from, q.to),
    );
  }

  @Get('revenue-by-service')
  @ApiOperation({ summary: 'Revenue grouped by service' })
  revenueByService(
    @CurrentTenant() tenantId: string,
    @Query() q: DateRangeQueryDto,
  ) {
    return this.reports.revenueByService(tenantId, this.range(q.from, q.to));
  }

  @Get('revenue-by-staff')
  @ApiOperation({ summary: 'Revenue grouped by staff' })
  revenueByStaff(
    @CurrentTenant() tenantId: string,
    @Query() q: DateRangeQueryDto,
  ) {
    return this.reports.revenueByStaff(tenantId, this.range(q.from, q.to));
  }

  @Get('appointments-by-status')
  @ApiOperation({ summary: 'Appointment counts by status' })
  appointmentsByStatus(
    @CurrentTenant() tenantId: string,
    @Query() q: DateRangeQueryDto,
  ) {
    return this.reports.appointmentsByStatus(tenantId, this.range(q.from, q.to));
  }

  @Get('top-clients')
  @ApiOperation({ summary: 'Top clients by revenue' })
  topClients(@CurrentTenant() tenantId: string, @Query() q: DateRangeQueryDto) {
    return this.reports.topClients(tenantId, this.range(q.from, q.to));
  }

  @Get('utilization')
  @ApiOperation({ summary: 'Staff occupancy / utilization' })
  utilization(
    @CurrentTenant() tenantId: string,
    @Query() q: DateRangeQueryDto,
  ) {
    return this.reports.utilization(tenantId, this.range(q.from, q.to));
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Products at or below their low-stock threshold' })
  lowStock(@CurrentTenant() tenantId: string) {
    return this.reports.lowStock(tenantId);
  }

  @Get('average-rating')
  @ApiOperation({ summary: 'Average review rating (overall & per staff)' })
  averageRating(@CurrentTenant() tenantId: string) {
    return this.reports.averageRating(tenantId);
  }
}
