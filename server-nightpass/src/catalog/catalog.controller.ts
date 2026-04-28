import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CatalogService } from './catalog.service';
import { ListCatalogVenuesQuery } from './dto/list-catalog-venues.query';

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

  @Get('events/:id')
  getEvent(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getEventById(id);
  }
}
