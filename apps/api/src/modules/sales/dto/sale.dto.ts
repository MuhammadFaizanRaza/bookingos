import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { SaleItemType } from '@salonos/database';

export class SaleLineDto {
  @ApiProperty({ enum: SaleItemType })
  @IsEnum(SaleItemType)
  type!: SaleItemType;

  @ApiPropertyOptional({ description: 'Service or product id (recommended)' })
  @IsOptional()
  @IsString()
  refId?: string;

  @ApiPropertyOptional({
    description: 'Override name; defaults to the service/product name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Override unit price; defaults to catalogue price',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'StaffProfile id (for commissions)' })
  @IsOptional()
  @IsString()
  staffId?: string;
}

export class CreateSaleDto {
  @ApiPropertyOptional({ description: 'Build sale from an appointment' })
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({
    type: [SaleLineDto],
    description: 'Required for ad-hoc sales; optional when from appointment',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleLineDto)
  items?: SaleLineDto[];
}

export class AddItemsDto {
  @ApiProperty({ type: [SaleLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleLineDto)
  items!: SaleLineDto[];
}

export class ApplyDiscountDto {
  @ApiProperty({ example: 'WELCOME10' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class SetTipTaxDto {
  @ApiPropertyOptional({ description: 'Tip amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tip?: number;

  @ApiPropertyOptional({ description: 'Tax rate percent, e.g. 8.875' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  taxRate?: number;
}
