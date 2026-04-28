import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailerModule } from '../mailer/mailer.module';
import { VenueStaffController } from './venue-staff.controller';
import { VenueStaffService } from './venue-staff.service';

@Module({
  imports: [AuthModule, MailerModule],
  controllers: [VenueStaffController],
  providers: [VenueStaffService],
})
export class VenueStaffModule {}
