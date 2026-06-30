import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../../tenant/current-tenant.decorator';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentIntentDto,
  RecordCashPaymentDto,
} from './dto/payment.dto';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('intent')
  @ApiOperation({ summary: 'Create a Stripe PaymentIntent for a sale' })
  createIntent(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.payments.createPaymentIntent(tenantId, dto);
  }

  @Post('cash')
  @ApiOperation({ summary: 'Record a cash payment' })
  cash(@CurrentTenant() tenantId: string, @Body() dto: RecordCashPaymentDto) {
    return this.payments.recordCash(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List payments (optionally by sale)' })
  @ApiQuery({ name: 'saleId', required: false })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('saleId') saleId?: string,
  ) {
    return this.payments.findAll(tenantId, saleId);
  }
}
