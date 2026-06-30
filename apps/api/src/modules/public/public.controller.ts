import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../../auth/decorators/public.decorator';
import { CurrentTenant } from '../../tenant/current-tenant.decorator';
import { PublicService } from './public.service';
import { PublicBookingDto } from './dto/public-booking.dto';
import {
  AvailabilityQueryDto,
  CapacityAvailabilityDto,
  DateRangeAvailabilityDto,
} from '../bookings/dto/booking.dto';

@ApiTags('public')
@Public()
@Controller('public')
export class PublicController {
  constructor(private readonly publicSvc: PublicService) {}

  @Get('site')
  @ApiOperation({ summary: 'Booking-site branding, locale & locations' })
  site(@CurrentTenant() tenantId: string) {
    return this.publicSvc.getSite(tenantId);
  }

  @Get('services')
  @ApiOperation({ summary: 'Online-bookable services' })
  services(@CurrentTenant() tenantId: string) {
    return this.publicSvc.getServices(tenantId);
  }

  @Get('staff')
  @ApiOperation({ summary: 'Bookable staff (optionally for a service)' })
  @ApiQuery({ name: 'serviceId', required: false })
  staff(
    @CurrentTenant() tenantId: string,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.publicSvc.getStaff(tenantId, serviceId);
  }

  @Get('availability')
  @ApiOperation({ summary: 'Free slots for a service on a date' })
  availability(
    @CurrentTenant() tenantId: string,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.publicSvc.getAvailability(tenantId, query);
  }

  @Get('availability/date-range')
  @ApiOperation({ summary: 'Units left for a DATE_RANGE offering (hotel/rental)' })
  dateRangeAvailability(
    @CurrentTenant() tenantId: string,
    @Query() query: DateRangeAvailabilityDto,
  ) {
    return this.publicSvc.checkDateRange(tenantId, {
      serviceId: query.serviceId,
      checkIn: query.checkIn,
      checkOut: query.checkOut,
      quantity: query.quantity,
    });
  }

  @Get('availability/capacity')
  @ApiOperation({ summary: 'Seats left for a CAPACITY offering session (class/event)' })
  capacityAvailability(
    @CurrentTenant() tenantId: string,
    @Query() query: CapacityAvailabilityDto,
  ) {
    return this.publicSvc.checkCapacity(tenantId, {
      serviceId: query.serviceId,
      start: query.start,
      quantity: query.quantity,
    });
  }

  @Get('locations')
  @ApiOperation({ summary: 'Active locations' })
  locations(@CurrentTenant() tenantId: string) {
    return this.publicSvc.getLocations(tenantId);
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Published reviews' })
  reviews(@CurrentTenant() tenantId: string) {
    return this.publicSvc.getReviews(tenantId);
  }

  @Post('bookings')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a guest booking (find-or-create client)' })
  book(@CurrentTenant() tenantId: string, @Body() dto: PublicBookingDto) {
    return this.publicSvc.createBooking(tenantId, dto);
  }
}
