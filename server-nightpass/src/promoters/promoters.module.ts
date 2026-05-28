import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailerModule } from '../mailer/mailer.module';
import { PasesModule } from '../pases/pases.module';
import { PromotersController } from './promoters.controller';
import { PromotersService } from './promoters.service';

@Module({
  imports: [AuthModule, MailerModule, PasesModule],
  controllers: [PromotersController],
  providers: [PromotersService],
  exports: [PromotersService],
})
export class PromotersModule {}
