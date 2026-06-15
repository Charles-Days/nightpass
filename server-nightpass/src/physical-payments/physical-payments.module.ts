import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeModule } from '../stripe/stripe.module';
import { CashWalletModule } from '../cash-wallet/cash-wallet.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { RewardsModule } from '../rewards/rewards.module';
import { PhysicalPaymentsController } from './physical-payments.controller';
import { PhysicalPaymentsService } from './physical-payments.service';

@Module({
  imports: [
    PrismaModule,
    StripeModule,
    CashWalletModule,
    LoyaltyModule,
    RewardsModule,
  ],
  controllers: [PhysicalPaymentsController],
  providers: [PhysicalPaymentsService],
  exports: [PhysicalPaymentsService],
})
export class PhysicalPaymentsModule {}
