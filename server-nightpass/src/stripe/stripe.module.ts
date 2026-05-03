import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StripeService } from './stripe.service';
import { StripeWebhookService } from './stripe-webhook.service';
import { StripeController } from './stripe.controller';

@Module({
  imports: [AuthModule],
  controllers: [StripeController],
  providers: [StripeService, StripeWebhookService],
  exports: [StripeService],
})
export class StripeModule {}
