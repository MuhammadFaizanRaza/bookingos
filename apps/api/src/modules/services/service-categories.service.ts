import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@bookingos/database';
import { TenantService } from '../../database/tenant.service';
import {
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
} from './dto/service-category.dto';

@Injectable()
export class ServiceCategoriesService {
  constructor(private readonly tenants: TenantService) {}

  create(tenantId: string, dto: CreateServiceCategoryDto) {
    // `tenantId` is stamped automatically by the tenant-scoped client.
    return this.tenants.getClient(tenantId).serviceCategory.create({
      data: dto as Prisma.ServiceCategoryUncheckedCreateInput,
    });
  }

  findAll(tenantId: string) {
    return this.tenants.getClient(tenantId).serviceCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { services: true } } },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateServiceCategoryDto) {
    await this.assertExists(tenantId, id);
    return this.tenants
      .getClient(tenantId)
      .serviceCategory.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.assertExists(tenantId, id);
    return this.tenants
      .getClient(tenantId)
      .serviceCategory.delete({ where: { id } });
  }

  private async assertExists(tenantId: string, id: string) {
    const found = await this.tenants
      .getClient(tenantId)
      .serviceCategory.findFirst({ where: { id } });
    if (!found) {
      throw new NotFoundException('Service category not found');
    }
  }
}
