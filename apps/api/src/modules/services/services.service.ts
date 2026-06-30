import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@bookingos/database';
import { TenantService } from '../../database/tenant.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly tenants: TenantService) {}

  create(tenantId: string, dto: CreateServiceDto) {
    const { staffIds, ...rest } = dto;
    // `tenantId` is stamped automatically by the tenant-scoped client.
    return this.tenants.getClient(tenantId).service.create({
      data: {
        ...rest,
        price: new Prisma.Decimal(dto.price),
        depositAmount:
          dto.depositAmount != null
            ? new Prisma.Decimal(dto.depositAmount)
            : undefined,
        staff: staffIds ? { connect: staffIds.map((id) => ({ id })) } : undefined,
      } as Prisma.ServiceUncheckedCreateInput,
      include: { staff: true, category: true },
    });
  }

  findAll(tenantId: string, categoryId?: string, activeOnly?: boolean) {
    return this.tenants.getClient(tenantId).service.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: { category: true, staff: { select: { id: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const service = await this.tenants
      .getClient(tenantId)
      .service.findFirst({ where: { id }, include: { category: true, staff: true } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  async update(tenantId: string, id: string, dto: UpdateServiceDto) {
    await this.findOne(tenantId, id);
    const { staffIds, price, depositAmount, ...rest } = dto;
    return this.tenants.getClient(tenantId).service.update({
      where: { id },
      data: {
        ...rest,
        ...(price != null ? { price: new Prisma.Decimal(price) } : {}),
        ...(depositAmount != null
          ? { depositAmount: new Prisma.Decimal(depositAmount) }
          : {}),
        ...(staffIds ? { staff: { set: staffIds.map((sid) => ({ id: sid })) } } : {}),
      },
      include: { category: true, staff: true },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.tenants.getClient(tenantId).service.delete({ where: { id } });
  }
}
