import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CatalogService } from './catalog.service';
import { ListCatalogVenuesQuery } from './dto/list-catalog-venues.query';
import { ListCatalogEventsQuery } from './dto/list-catalog-events.query';
import { GetVenueOccupancyQuery } from './dto/get-venue-occupancy.query';

@Controller('catalog')
@SkipThrottle()
export class CatalogController {
  constructor(private readonly service: CatalogService) {}

  @Get('venues')
  listVenues(@Query() query: ListCatalogVenuesQuery) {
    return this.service.listVenues(query);
  }

  @Get('venues/:slug')
  getVenue(@Param('slug') slug: string) {
    return this.service.getVenueBySlug(slug);
  }

  @Get('venues/:id/occupancy')
  getVenueOccupancy(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetVenueOccupancyQuery,
  ) {
    return this.service.getVenueOccupancy(id, query.windowMinutes);
  }

  @Get('promoters/:slug')
  getPromoter(@Param('slug') slug: string) {
    return this.service.getPromoterBySlug(slug);
  }

  @Get('events')
  listEvents(@Query() query: ListCatalogEventsQuery) {
    return this.service.listCatalogEvents(query);
  }

  @Get('events/:id')
  getEvent(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getEventById(id);
  }

  @Get('tiers/:tierId')
  getTier(@Param('tierId', ParseUUIDPipe) tierId: string) {
    return this.service.getTierById(tierId);
  }

  @Get('stats')
  getStats() {
    return this.service.getPublicStats();
  }
}
