import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';

@Module({
  imports: [AuthModule, LoyaltyModule],
  controllers: [RewardsController],
  providers: [RewardsService],
})
export class RewardsModule {}
