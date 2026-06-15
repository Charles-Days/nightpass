import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CashWalletModule } from '../cash-wallet/cash-wallet.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { RewardsModule } from '../rewards/rewards.module';
import { StripeService } from './stripe.service';
import { StripeWebhookService } from './stripe-webhook.service';
import { StripeController } from './stripe.controller';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => CashWalletModule),
    LoyaltyModule,
    RewardsModule,
  ],
  controllers: [StripeController],
  providers: [StripeService, StripeWebhookService],
  exports: [StripeService],
})
export class StripeModule {}
