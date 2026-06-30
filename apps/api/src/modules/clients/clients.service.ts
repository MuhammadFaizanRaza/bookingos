import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@salonos/database';
import { TenantService } from '../../database/tenant.service';
import {
  PaginatedResult,
  PaginationDto,
  paginate,
} from '../../common/dto/pagination.dto';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly tenants: TenantService) {}

  create(tenantId: string, dto: CreateClientDto) {
    // `tenantId` is stamped automatically by the tenant-scoped client.
    return this.tenants.getClient(tenantId).client.create({
      data: {
        ...dto,
        email: dto.email?.toLowerCase(),
      } as Prisma.ClientUncheckedCreateInput,
    });
  }

  /** Search by name / email / phone (case-insensitive), paginated. */
  async findAll(
    tenantId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<unknown>> {
    const db = this.tenants.getClient(tenantId);
    const where: Prisma.ClientWhereInput = pagination.q
      ? {
          OR: [
            { name: { contains: pagination.q, mode: 'insensitive' } },
            { email: { contains: pagination.q, mode: 'insensitive' } },
            { phone: { contains: pagination.q, mode: 'insensitive' } },
          ],
        }
      : {};

    const [rawClients, total] = await Promise.all([
      db.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          _count: { select: { appointments: true } },
          appointments: {
            orderBy: { startsAt: 'desc' },
            take: 1,
            select: { startsAt: true },
          },
          sales: { select: { total: true } },
        },
      }),
      db.client.count({ where }),
    ]);

    const data = rawClients.map(({ appointments, sales, ...client }) => ({
      ...client,
      lastVisit: appointments[0]?.startsAt ?? null,
      totalSpent: sales.reduce((sum: number, s: { total: unknown }) => sum + Number(s.total), 0),
    }));

    return paginate(data, total, pagination);
  }

  async findOne(tenantId: string, id: string) {
    const client = await this.tenants.getClient(tenantId).client.findFirst({
      where: { id },
      include: {
        appointments: { orderBy: { startsAt: 'desc' }, take: 20 },
        sales: { orderBy: { createdAt: 'desc' }, take: 20 },
        reviews: true,
      },
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  async update(tenantId: string, id: string, dto: UpdateClientDto) {
    await this.assertExists(tenantId, id);
    return this.tenants.getClient(tenantId).client.update({
      where: { id },
      data: { ...dto, ...(dto.email ? { email: dto.email.toLowerCase() } : {}) },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.assertExists(tenantId, id);
    return this.tenants.getClient(tenantId).client.delete({ where: { id } });
  }

  private async assertExists(tenantId: string, id: string) {
    const found = await this.tenants
      .getClient(tenantId)
      .client.findFirst({ where: { id } });
    if (!found) {
      throw new NotFoundException('Client not found');
    }
  }
}
