import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@bookingos/database';
import { TenantService } from '../../database/tenant.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly tenants: TenantService) {}

  create(tenantId: string, dto: CreateLocationDto) {
    // `tenantId` is stamped automatically by the tenant-scoped client.
    return this.tenants.getClient(tenantId).location.create({
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
