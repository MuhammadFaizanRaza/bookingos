import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Plan } from '@salonos/database';

export class CreateCheckoutDto {
  @ApiProperty({ enum: Plan, description: 'SaaS plan to subscribe to' })
  @IsEnum(Plan)
  plan!: Plan;
}
