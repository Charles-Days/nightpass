import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PromotersModule } from '../promoters/promoters.module';
import { PromoterApplicationsController } from './promoter-applications.controller';
import { PromoterApplicationsService } from './promoter-applications.service';

@Module({
  imports: [AuthModule, PromotersModule],
  controllers: [PromoterApplicationsController],
  providers: [PromoterApplicationsService],
})
export class PromoterApplicationsModule {}
