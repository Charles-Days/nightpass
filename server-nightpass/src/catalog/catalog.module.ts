import { Module } from '@nestjs/common';
import { LocationsModule } from '../locations/locations.module';
import { MetricsModule } from '../metrics/metrics.module';
import { RewardsModule } from '../rewards/rewards.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [LocationsModule, MetricsModule, RewardsModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
