import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { StoriesService } from './stories.service';

/**
 * Endpoints públicos (sin auth) para feed/viewer de stories.
 * Montados bajo /catalog para que el cliente web los consuma junto al resto
 * del catálogo público.
 */
@Controller('catalog')
@SkipThrottle()
export class StoriesPublicController {
  constructor(private readonly service: StoriesService) {}

  @Get('stories/active')
  getActive() {
    return this.service.getActiveGroupedByVenue();
  }

  @Get('venues/:slug/stories')
  getByVenueSlug(@Param('slug') slug: string) {
    return this.service.getActiveByVenueSlug(slug);
  }

  @Get('events/:id/stories')
  getByEventId(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getActiveByEventId(id);
  }
}
