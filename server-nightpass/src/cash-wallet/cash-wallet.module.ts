import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeModule } from '../stripe/stripe.module';
import { CashWalletController } from './cash-wallet.controller';
import { CashWalletService } from './cash-wallet.service';

@Module({
  imports: [PrismaModule, forwardRef(() => StripeModule)],
  controllers: [CashWalletController],
  providers: [CashWalletService],
  exports: [CashWalletService],
})
export class CashWalletModule {}
