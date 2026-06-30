import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { BookingMode } from '@bookingos/database';

export class CreateServiceDto {
  @ApiProperty({ example: "Women's Haircut & Style" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'ServiceCategory id' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    enum: BookingMode,
    default: BookingMode.TIME_SLOT,
    description: 'Booking model: TIME_SLOT | DATE_RANGE | CAPACITY',
  })
  @IsOptional()
  @IsEnum(BookingMode)
  bookingMode?: BookingMode;

  @ApiPropertyOptional({ description: 'CAPACITY: max seats/covers/tickets per session' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'DATE_RANGE: number of identical units available' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  inventory?: number;

  @ApiProperty({ example: 60, description: 'Duration in minutes' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMin!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bufferBeforeMin?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bufferAfterMin?: number;

  @ApiProperty({ example: 75 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: '#7C3AED' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  onlineBookable?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  depositRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'StaffProfile ids that can perform this service',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  staffIds?: string[];
}

export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
