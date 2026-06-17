import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MailerModule } from '../mailer/mailer.module';
import { StripeModule } from '../stripe/stripe.module';
import { RpController } from './rp.controller';
import { RpService } from './rp.service';

@Module({
  imports: [PrismaModule, MailerModule, StripeModule],
  controllers: [RpController],
  providers: [RpService],
  exports: [RpService],
})
export class RpModule {}
