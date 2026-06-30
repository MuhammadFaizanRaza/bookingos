import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@salonos/database';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentTenant } from '../../tenant/current-tenant.decorator';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/billing.dto';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('subscription')
  @ApiOperation({ summary: 'Current subscription & billing status' })
  status(@CurrentTenant() tenantId: string) {
    return this.billing.getStatus(tenantId);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Current resource usage vs plan limits' })
  usage(@CurrentTenant() tenantId: string) {
    return this.billing.getUsage(tenantId);
  }

  @Post('checkout')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Create a Stripe Checkout session for a plan' })
  checkout(@CurrentTenant() tenantId: string, @Body() dto: CreateCheckoutDto) {
    return this.billing.createCheckout(tenantId, dto.plan);
  }

  @Post('portal')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Create a Stripe customer-portal link' })
  portal(@CurrentTenant() tenantId: string) {
    return this.billing.createPortal(tenantId);
  }
}
