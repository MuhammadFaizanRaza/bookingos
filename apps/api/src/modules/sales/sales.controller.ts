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
import { Role, SaleStatus } from '@bookingos/database';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentTenant } from '../../tenant/current-tenant.decorator';
import { SalesService } from './sales.service';
import {
  AddItemsDto,
  ApplyDiscountDto,
  CreateSaleDto,
  SetTipTaxDto,
} from './dto/sale.dto';

@ApiTags('sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Post()
  @ApiOperation({ summary: 'Open a sale (ad-hoc or from an appointment)' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateSaleDto) {
    return this.sales.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List sales' })
  @ApiQuery({ name: 'status', required: false, enum: SaleStatus })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: SaleStatus,
  ) {
    return this.sales.findAll(tenantId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a sale' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.sales.findOne(tenantId, id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add items to an open sale' })
  addItems(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AddItemsDto,
  ) {
    return this.sales.addItems(tenantId, id, dto);
  }

  @Delete(':id/items/:itemId')
  @Roles(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST)
  @ApiOperation({ summary: 'Remove a sale line' })
  removeItem(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.sales.removeItem(tenantId, id, itemId);
  }

  @Post(':id/discount')
  @Roles(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST)
  @ApiOperation({ summary: 'Apply a discount code' })
  applyDiscount(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ApplyDiscountDto,
  ) {
    return this.sales.applyDiscount(tenantId, id, dto);
  }

  @Patch(':id/tip-tax')
  @Roles(Role.OWNER, Role.MANAGER, Role.RECEPTIONIST)
  @ApiOperation({ summary: 'Set tip and/or tax rate and recompute totals' })
  setTipTax(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SetTipTaxDto,
  ) {
    return this.sales.setTipTax(tenantId, id, dto);
  }

  @Patch(':id/void')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Void an open sale' })
  voidSale(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.sales.void(tenantId, id);
  }
}
