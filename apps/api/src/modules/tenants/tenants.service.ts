import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(tenantId: string) {
    return this.prisma.client.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: { subscription: true },
    });
  }

  async update(tenantId: string, dto: UpdateTenantDto) {
    return this.prisma.client.tenant.update({
      where: { id: tenantId },
      data: dto,
    });
  }
}
