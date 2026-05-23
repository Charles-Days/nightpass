import { Module } from '@nestjs/common';
import { LocationsModule } from '../locations/locations.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [LocationsModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
