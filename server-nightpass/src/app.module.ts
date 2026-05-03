import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { MailerModule } from './mailer/mailer.module';
import { VenuesModule } from './venues/venues.module';
import { VenueApplicationsModule } from './venue-applications/venue-applications.module';
import { UsersModule } from './users/users.module';
import { VenueStaffModule } from './venue-staff/venue-staff.module';
import { StorageModule } from './storage/storage.module';
import { CatalogModule } from './catalog/catalog.module';
import { UploadsModule } from './uploads/uploads.module';
import { EventsModule } from './events/events.module';
import { StripeModule } from './stripe/stripe.module';
import { OrdersModule } from './orders/orders.module';
import { PassesModule } from './passes/passes.module';
import { validateEnv } from './config/env.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    MailerModule,
    AuthModule,
    HealthModule,
    VenuesModule,
    VenueApplicationsModule,
    UsersModule,
    VenueStaffModule,
    StorageModule,
    CatalogModule,
    UploadsModule,
    EventsModule,
    StripeModule,
    OrdersModule,
    PassesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
