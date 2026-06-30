import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../../tenant/current-tenant.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { BookingsService } from './bookings.service';
import {
  AvailabilityQueryDto,
  CancelBookingDto,
  CreateBookingDto,
  ListBookingsQueryDto,
  RescheduleBookingDto,
  UpdateStatusDto,
} from './dto/booking.dto';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get('notifications')
  @ApiOperation({ summary: 'Recent booking notifications for the current user' })
  getNotifications(
    @CurrentTenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.bookings.getNotifications(tenantId, userId, role);
  }

  @Get('availability')
  @ApiOperation({
    summary: 'Compute free slots for a service on a date (per staff)',
  })
  availability(
    @CurrentTenant() tenantId: string,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.bookings.getAvailability(tenantId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create an appointment with items' })
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateBookingDto) {
    return this.bookings.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List appointments by date range / staff / status' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query() query: ListBookingsQueryDto,
  ) {
    return this.bookings.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an appointment' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.bookings.findOne(tenantId, id);
  }

  @Patch(':id/reschedule')
  @ApiOperation({ summary: 'Reschedule an appointment' })
  reschedule(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.bookings.reschedule(tenantId, id, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an appointment' })
  cancel(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookings.cancel(tenantId, id, dto.reason);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transition appointment status' })
  updateStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.bookings.updateStatus(tenantId, id, dto.status);
  }
}
