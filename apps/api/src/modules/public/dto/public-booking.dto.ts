import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

function toUtcDate({ value }: { value: unknown }): Date {
  if (value instanceof Date) return value;
  const s = String(value ?? '');
  const normalized = /[Zz]|[+\-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`;
  return new Date(normalized);
}

export class PublicBookingItemDto {
  @ApiProperty({ description: 'Service id' })
  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @ApiPropertyOptional({ description: 'Preferred StaffProfile id' })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiProperty({ example: '2026-06-20T13:00:00.000Z' })
  @Transform(toUtcDate)
  @IsDate()
  startsAt!: Date;
}

export class PublicBookingDto {
  @ApiProperty({ example: 'Emma Wilson' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'emma@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+1 212 555 1001' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PublicBookingItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PublicBookingItemDto)
  items!: PublicBookingItemDto[];
}
