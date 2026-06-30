import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@bookingos/database';
import { TenantService } from '../../database/tenant.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly tenants: TenantService) {}

  create(tenantId: string, dto: CreateReviewDto) {
    // `tenantId` is stamped automatically by the tenant-scoped client.
    return this.tenants.getClient(tenantId).review.create({
      data: dto as Prisma.ReviewUncheckedCreateInput,
    });
  }

  findAll(tenantId: string, staffId?: string, publishedOnly?: boolean) {
    return this.tenants.getClient(tenantId).review.findMany({
      where: {
        ...(staffId ? { staffId } : {}),
        ...(publishedOnly ? { isPublished: true } : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
        staff: { select: { id: true, user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateReviewDto) {
    await this.assertExists(tenantId, id);
    return this.tenants
      .getClient(tenantId)
      .review.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.assertExists(tenantId, id);
    return this.tenants.getClient(tenantId).review.delete({ where: { id } });
  }

  private async assertExists(tenantId: string, id: string) {
    const found = await this.tenants
      .getClient(tenantId)
      .review.findFirst({ where: { id } });
    if (!found) {
      throw new NotFoundException('Review not found');
    }
  }
}
