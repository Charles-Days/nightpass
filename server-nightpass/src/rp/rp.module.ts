import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MailerModule } from '../mailer/mailer.module';
import { RpController } from './rp.controller';
import { RpService } from './rp.service';

@Module({
  imports: [PrismaModule, MailerModule],
  controllers: [RpController],
  providers: [RpService],
  exports: [RpService],
})
export class RpModule {}
