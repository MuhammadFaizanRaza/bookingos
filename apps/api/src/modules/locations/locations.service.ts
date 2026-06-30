import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@bookingos/database';
import { TenantService } from '../../database/tenant.service';
import { PLAN_LIMITS } from '../billing/billing.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly tenants: TenantService) {}

  async create(tenantId: string, dto: CreateLocationDto) {
    const db = this.tenants.getClient(tenantId);
    // Enforce plan limit (Tenant is not tenant-scoped, so findUnique by id works).
    const tenant = await db.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { plan: true },
    });
    const limit = PLAN_LIMITS[tenant.plan].maxLocations;
    const count = await db.location.count();
    if (count >= limit) {
      throw new ForbiddenException(
        `Your ${tenant.plan} plan allows up to ${limit} location(s). Upgrade your plan to add more.`,
      );
    }
    // `tenantId` is stamped automatically by the tenant-scoped client.
    return db.location.create({
      data: dto as Prisma.LocationUncheckedCreateInput,
    });
  }

  findAll(tenantId: string) {
    return this.tenants
      .getClient(tenantId)
      .location.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findOne(tenantId: string, id: string) {
    const location = await this.tenants
      .getClient(tenantId)
      .location.findFirst({ where: { id } });
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    return location;
  }

  async update(tenantId: string, id: string, dto: UpdateLocationDto) {
    await this.findOne(tenantId, id);
    return this.tenants
      .getClient(tenantId)
      .location.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.tenants.getClient(tenantId).location.delete({ where: { id } });
  }
}
