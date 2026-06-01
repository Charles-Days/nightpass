import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeModule } from '../stripe/stripe.module';
import { CashWalletModule } from '../cash-wallet/cash-wallet.module';
import { PhysicalPaymentsController } from './physical-payments.controller';
import { PhysicalPaymentsService } from './physical-payments.service';

@Module({
  imports: [PrismaModule, StripeModule, CashWalletModule],
  controllers: [PhysicalPaymentsController],
  providers: [PhysicalPaymentsService],
  exports: [PhysicalPaymentsService],
})
export class PhysicalPaymentsModule {}
