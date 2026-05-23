import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { LoyaltyCheckinController } from './loyalty-checkin.controller';

@Module({
  imports: [AuthModule, LoyaltyModule],
  controllers: [LoyaltyCheckinController],
})
export class LoyaltyCheckinModule {}
