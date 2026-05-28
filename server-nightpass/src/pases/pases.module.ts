import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';
import { PasesController } from './pases.controller';
import { PasesService } from './pases.service';

@Module({
  imports: [AuthModule, OrdersModule],
  controllers: [PasesController],
  providers: [PasesService],
  exports: [PasesService],
})
export class PasesModule {}
