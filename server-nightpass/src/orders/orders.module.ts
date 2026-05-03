import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StripeModule } from '../stripe/stripe.module';
import { OrdersController } from './orders.controller';
import { EventSalesController } from './event-sales.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule, StripeModule],
  controllers: [OrdersController, EventSalesController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
