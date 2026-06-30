import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Role } from '@salonos/database';

export class CreateStaffDto {
  @ApiProperty({ example: 'Amir Khan', description: 'Staff member full name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'amir@lumiere.demo' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'Optional login password. If set, the user can sign in.',
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Senior Stylist' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: '#0EA5E9' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ example: 30, description: 'Commission percent' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @ApiPropertyOptional({ description: 'Home location id' })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isBookable?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Service ids offered' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceIds?: string[];
}

export class UpdateStaffDto extends PartialType(CreateStaffDto) {
  @ApiPropertyOptional({ enum: Role, description: 'Change this staff member\'s role' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class WorkingHoursItemDto {
  @ApiProperty({ example: 1, description: '0=Sun .. 6=Sat' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: 540, description: 'Start minutes from midnight' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  startMin!: number;

  @ApiProperty({ example: 1020, description: 'End minutes from midnight' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  endMin!: number;
}

export class SetWorkingHoursDto {
  @ApiProperty({ type: [WorkingHoursItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursItemDto)
  hours!: WorkingHoursItemDto[];
}

export class CreateTimeOffDto {
  @ApiProperty({ example: '2026-07-01T09:00:00.000Z' })
  @Type(() => Date)
  startsAt!: Date;

  @ApiProperty({ example: '2026-07-05T17:00:00.000Z' })
  @Type(() => Date)
  endsAt!: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
