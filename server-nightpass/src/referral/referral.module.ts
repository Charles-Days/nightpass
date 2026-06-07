import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';

@Module({
  imports: [AuthModule, LoyaltyModule],
  controllers: [ReferralController],
  providers: [ReferralService],
})
export class ReferralModule {}
