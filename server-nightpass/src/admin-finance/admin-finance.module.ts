import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsModule } from '../metrics/metrics.module';
import { AdminFinanceController } from './admin-finance.controller';
import { AdminFinanceService } from './admin-finance.service';

@Module({
  imports: [PrismaModule, MetricsModule],
  controllers: [AdminFinanceController],
  providers: [AdminFinanceService],
})
export class AdminFinanceModule {}
