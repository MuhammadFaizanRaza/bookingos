import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { AppointmentStatus, BookingSource } from '@salonos/database';

/** Converts an ISO string (with or without timezone) to a UTC Date. */
function toUtcDate({ value }: { value: unknown }): Date {
  if (value instanceof Date) {
    if (!isNaN(value.getTime())) return value;
    // Invalid Date — can't recover, return as-is for @IsDate to reject
    return value;
  }
  const s = String(value ?? '');
  // Append Z when no offset is present so V8 parses as UTC rather than local time
  const normalized = /[Zz]|[+\-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`;
  return new Date(normalized);
}

export class AppointmentItemDto {
  @ApiProperty({ description: 'Service id' })
  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @ApiPropertyOptional({ description: 'Assigned StaffProfile id' })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiProperty({
    example: '2026-06-20T13:00:00.000Z',
    description: 'Item start time (ISO 8601, with or without timezone).',
  })
  @Transform(toUtcDate)
  @IsDate()
  startsAt!: Date;
}

export class CreateBookingDto {
  @ApiPropertyOptional({ description: 'Existing client id' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Location id' })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({ enum: BookingSource, default: BookingSource.ADMIN })
  @IsOptional()
  @IsEnum(BookingSource)
  source?: BookingSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [AppointmentItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AppointmentItemDto)
  items!: AppointmentItemDto[];
}

export class RescheduleBookingDto {
  @ApiProperty({ type: [AppointmentItemDto], description: 'New item schedule' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AppointmentItemDto)
  items!: AppointmentItemDto[];
}

export class CancelBookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateStatusDto {
  @ApiProperty({ enum: AppointmentStatus })
  @IsEnum(AppointmentStatus)
  status!: AppointmentStatus;
}

export class AvailabilityQueryDto {
  @ApiProperty({ description: 'Service id' })
  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @ApiProperty({ example: '2026-06-20', description: 'Date YYYY-MM-DD' })
  @IsString()
  @IsNotEmpty()
  date!: string;

  @ApiPropertyOptional({ description: 'Limit to one staff member' })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiPropertyOptional({ description: 'Slot granularity in minutes', default: 15 })
  @IsOptional()
  @Type(() => Number)
  stepMin?: number;
}

export class ListBookingsQueryDto {
  @ApiPropertyOptional({ example: '2026-06-01', description: 'Range start (date or ISO)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: 'Filter by staff id' })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}
