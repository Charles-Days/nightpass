import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import type Redis from 'ioredis';
import { RedisModule, REDIS_CLIENT } from './redis/redis.module';
import { SecurityModule } from './security/security.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { MailerModule } from './mailer/mailer.module';
import { PushModule } from './push/push.module';
import { NotificationsModule } from './notifications/notifications.module';
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
import { ReferralModule } from './referral/referral.module';
import { RewardsModule } from './rewards/rewards.module';
import { LoyaltyCheckinModule } from './loyalty-checkin/loyalty-checkin.module';
import { StoriesModule } from './stories/stories.module';
import { RpModule } from './rp/rp.module';
import { AdminFinanceModule } from './admin-finance/admin-finance.module';
import { AdminPassesModule } from './admin-passes/admin-passes.module';
import { PhysicalPaymentsModule } from './physical-payments/physical-payments.module';
import { CashWalletModule } from './cash-wallet/cash-wallet.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { MetricsModule } from './metrics/metrics.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { validateEnv } from './config/env.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateEnv,
    }),
    RedisModule,
    // Throttler con storage en Redis → límites compartidos entre instancias y
    // persistentes a reinicios (el storage en memoria por defecto no lo es).
    ThrottlerModule.forRootAsync({
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) => ({
        throttlers: [{ ttl: 60_000, limit: 100 }],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
    SecurityModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    MailerModule,
    WhatsappModule,
    PushModule,
    NotificationsModule,
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
    ReferralModule,
    RewardsModule,
    LoyaltyCheckinModule,
    StoriesModule,
    RpModule,
    AdminFinanceModule,
    AdminPassesModule,
    PhysicalPaymentsModule,
    CashWalletModule,
    MaintenanceModule,
    MetricsModule,
  ],
  // Los guards globales (blocklist + throttler) se registran en SecurityModule.
})
export class AppModule {}
