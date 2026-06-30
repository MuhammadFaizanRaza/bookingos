import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';
import { Vertical } from '@bookingos/database';

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'Lumière Beauty Lounge' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'en', description: 'IETF locale' })
  @IsOptional()
  @IsString()
  @Length(2, 10)
  locale?: string;

  @ApiPropertyOptional({ example: 'USD', description: 'ISO 4217 currency' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ example: 'America/New_York', description: 'IANA tz' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ example: '#7C3AED' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional({ example: 'Where every look becomes art.' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  tagline?: string;

  @ApiPropertyOptional({ description: 'Cover image for the booking page' })
  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: 'About / description on the booking page' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  about?: string;

  @ApiPropertyOptional({ example: '+1 212 555 0101' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ example: '120 Spring Street, New York' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @ApiPropertyOptional({ example: 'https://instagram.com/yoursalon' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  instagramUrl?: string;

  @ApiPropertyOptional({ example: 'https://facebook.com/yoursalon' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  facebookUrl?: string;

  @ApiPropertyOptional({ example: '+1 212 555 0101' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  whatsapp?: string;

  @ApiPropertyOptional({ description: 'Accept online bookings on the public site' })
  @IsOptional()
  @IsBoolean()
  bookingEnabled?: boolean;

  // NOTE: `plan` is intentionally NOT settable here. The billing plan is driven
  // solely by Stripe (checkout + webhooks); allowing it on this DTO would let an
  // owner self-upgrade to BUSINESS (unlimited limits) for free. See billing module.

  @ApiPropertyOptional({ enum: Vertical, description: 'Industry vertical' })
  @IsOptional()
  @IsEnum(Vertical)
  vertical?: Vertical;
}
