import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Vertical } from '@bookingos/database';

export class RegisterDto {
  @ApiProperty({ example: 'Lumière Beauty Lounge', description: 'Business name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  salonName!: string;

  @ApiPropertyOptional({
    enum: Vertical,
    example: Vertical.SALON,
    description: 'Industry vertical (drives terminology + defaults)',
  })
  @IsOptional()
  @IsEnum(Vertical)
  vertical?: Vertical;

  @ApiProperty({
    example: 'lumiere',
    description: 'Desired subdomain slug (lowercase, a-z 0-9 and hyphens)',
  })
  @IsString()
  @Matches(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/, {
    message:
      'slug must be 2-40 chars, lowercase letters/numbers/hyphens, not start/end with a hyphen',
  })
  slug!: string;

  @ApiProperty({ example: 'Sofia Marchetti', description: 'Owner full name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  ownerName!: string;

  @ApiProperty({ example: 'owner@lumiere.demo' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Passw0rd!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'owner@lumiere.demo' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Passw0rd!' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({
    required: false,
    example: 'lumiere',
    description:
      'Tenant slug. Optional if sent via x-tenant-slug header / subdomain.',
  })
  @IsOptional()
  @IsString()
  slug?: string;
}

export class RefreshDto {
  @ApiProperty({ description: 'A valid refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
