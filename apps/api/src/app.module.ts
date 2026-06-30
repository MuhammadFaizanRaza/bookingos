import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DatabaseModule } from './database/database.module';
import { MessagingModule } from './messaging/messaging.module';
import { StripeModule } from './stripe/stripe.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { HealthController } from './health/health.controller';
import { TenantsModule } from './modules/tenants/tenants.module';
import { LocationsModule } from './modules/locations/locations.module';
import { StaffModule } from './modules/staff/staff.module';
import { ServicesModule } from './modules/services/services.module';
import { ClientsModule } from './modules/clients/clients.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { ProductsModule } from './modules/products/products.module';
import { SalesModule } from './modules/sales/sales.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { BillingModule } from './modules/billing/billing.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { PublicModule } from './modules/public/public.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Use the monorepo root .env (apps/api → ../../.env)
      envFilePath: ['../../.env', '.env'],
    }),
    DatabaseModule,
    MessagingModule,
    StripeModule,
    AuthModule,
    TenantsModule,
    LocationsModule,
    StaffModule,
    ServicesModule,
    ClientsModule,
    BookingsModule,
    ProductsModule,
    SalesModule,
    PaymentsModule,
    BillingModule,
    ReportsModule,
    ReviewsModule,
    PublicModule,
    WebhooksModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Resolve the tenant for every request; auth/webhook routes simply won't
    // have one and don't call @CurrentTenant().
    // Nest 11 runs on Express 5 / path-to-regexp v8 where '*' is invalid —
    // use the named splat wildcard instead.
    consumer.apply(TenantMiddleware).forRoutes({
      path: '{*splat}',
      method: RequestMethod.ALL,
    });
  }
}
