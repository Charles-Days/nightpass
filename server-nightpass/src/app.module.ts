import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { MailerModule } from './mailer/mailer.module';
import { PushModule } from './push/push.module';
import { VenuesModule } from './venues/venues.module';
import { VenueApplicationsModule } from './venue-applications/venue-applications.module';
import { PromoterApplicationsModule } from './promoter-applications/promoter-applications.module';
import { UsersModule } from './users/users.module';
import { VenueStaffModule } from './venue-staff/venue-staff.module';
import { StorageModule } from './storage/storage.module';
import { CatalogModule } from './catalog/catalog.module';
import { UploadsModule } from './uploads/uploads.module';
import { EventsModule } from './events/events.module';
import { StripeModule } from './stripe/stripe.module';
import { OrdersModule } from './orders/orders.module';
import { PassesModule } from './passes/passes.module';
import { PasesModule } from './pases/pases.module';
import { LocationsModule } from './locations/locations.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { LoyaltyCheckinModule } from './loyalty-checkin/loyalty-checkin.module';
import { StoriesModule } from './stories/stories.module';
import { RpModule } from './rp/rp.module';
import { AdminFinanceModule } from './admin-finance/admin-finance.module';
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
    ScheduleModule.forRoot(),
    PrismaModule,
    MailerModule,
    PushModule,
    AuthModule,
    HealthModule,
    VenuesModule,
    VenueApplicationsModule,
    PromoterApplicationsModule,
    UsersModule,
    VenueStaffModule,
    StorageModule,
    CatalogModule,
    UploadsModule,
    EventsModule,
    StripeModule,
    OrdersModule,
    PassesModule,
    PasesModule,
    LocationsModule,
    LoyaltyModule,
    LoyaltyCheckinModule,
    StoriesModule,
    RpModule,
    AdminFinanceModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
