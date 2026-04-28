import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VenuesModule } from '../venues/venues.module';
import { VenueApplicationsController } from './venue-applications.controller';
import { VenueApplicationsService } from './venue-applications.service';

@Module({
  imports: [AuthModule, VenuesModule],
  controllers: [VenueApplicationsController],
  providers: [VenueApplicationsService],
})
export class VenueApplicationsModule {}
