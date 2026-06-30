import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@salonos/database';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentTenant } from '../../tenant/current-tenant.decorator';
import { ProductsService } from './products.service';
import {
  CreateMovementDto,
  CreateProductDto,
  UpdateProductDto,
} from './dto/product.dto';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create a product' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateProductDto) {
    return this.products.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List products' })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('lowStock') lowStock?: string,
  ) {
    if (lowStock === 'true') {
      return this.products.lowStock(tenantId);
    }
    return this.products.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product with recent movements' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.products.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update a product' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Delete a product' })
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.products.remove(tenantId, id);
  }

  @Post(':id/movements')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Record an inventory movement & adjust stock' })
  addMovement(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateMovementDto,
  ) {
    return this.products.addMovement(tenantId, id, dto);
  }
}
