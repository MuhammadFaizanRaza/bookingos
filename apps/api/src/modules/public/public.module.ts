import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [BookingsModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
