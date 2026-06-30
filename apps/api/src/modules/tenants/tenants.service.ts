import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(tenantId: string) {
    const tenant = await this.prisma.client.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: { subscription: true },
    });
    // Never expose internal Stripe identifiers to the client.
    const { stripeCustomerId: _c, stripeAccountId: _a, ...safe } = tenant;
    return safe;
  }

  async update(tenantId: string, dto: UpdateTenantDto) {
    const tenant = await this.prisma.client.tenant.update({
      where: { id: tenantId },
      data: dto,
    });
    const { stripeCustomerId: _c, stripeAccountId: _a, ...safe } = tenant;
    return safe;
  }
}
