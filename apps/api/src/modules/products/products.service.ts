import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@bookingos/database';
import { TenantService } from '../../database/tenant.service';
import {
  CreateMovementDto,
  CreateProductDto,
  UpdateProductDto,
} from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly tenants: TenantService) {}

  create(tenantId: string, dto: CreateProductDto) {
    // `tenantId` is stamped automatically by the tenant-scoped client.
    return this.tenants.getClient(tenantId).product.create({
      data: {
        ...dto,
        price: new Prisma.Decimal(dto.price),
        cost: dto.cost != null ? new Prisma.Decimal(dto.cost) : undefined,
      } as Prisma.ProductUncheckedCreateInput,
    });
  }

  findAll(tenantId: string) {
    return this.tenants
      .getClient(tenantId)
      .product.findMany({ orderBy: { name: 'asc' } });
  }

  /** Products at or below their per-product low-stock threshold. */
  async lowStock(tenantId: string) {
    const products = await this.tenants
      .getClient(tenantId)
      .product.findMany({ where: { isActive: true } });
    return products.filter((p) => p.stockQty <= p.lowStockAt);
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.tenants.getClient(tenantId).product.findFirst({
      where: { id },
      include: { movements: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    await this.assertExists(tenantId, id);
    const { price, cost, ...rest } = dto;
    return this.tenants.getClient(tenantId).product.update({
      where: { id },
      data: {
        ...rest,
        ...(price != null ? { price: new Prisma.Decimal(price) } : {}),
        ...(cost != null ? { cost: new Prisma.Decimal(cost) } : {}),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.assertExists(tenantId, id);
    return this.tenants.getClient(tenantId).product.delete({ where: { id } });
  }

  /** Records an inventory movement and adjusts stock atomically. */
  async addMovement(tenantId: string, id: string, dto: CreateMovementDto) {
    const product = await this.assertExists(tenantId, id);
    const newQty = product.stockQty + dto.quantity;
    if (newQty < 0) {
      throw new BadRequestException('Movement would make stock negative');
    }
    const db = this.tenants.getClient(tenantId);
    await db.$transaction([
      db.product.update({ where: { id }, data: { stockQty: newQty } }),
      // InventoryMovement is a child table (no tenantId) — reached via the
      // validated, tenant-owned product above.
      db.inventoryMovement.create({
        data: {
          productId: id,
          type: dto.type,
          quantity: dto.quantity,
          reason: dto.reason,
        },
      }),
    ]);
    return this.findOne(tenantId, id);
  }

  private async assertExists(tenantId: string, id: string) {
    const product = await this.tenants
      .getClient(tenantId)
      .product.findFirst({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }
}
