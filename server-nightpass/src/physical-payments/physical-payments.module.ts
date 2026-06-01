import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PhysicalPaymentsController } from './physical-payments.controller';
import { PhysicalPaymentsService } from './physical-payments.service';

@Module({
  imports: [PrismaModule],
  controllers: [PhysicalPaymentsController],
  providers: [PhysicalPaymentsService],
  exports: [PhysicalPaymentsService],
})
export class PhysicalPaymentsModule {}
