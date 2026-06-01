import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { CatalogService } from './catalog.service';
import { ListCatalogVenuesQuery } from './dto/list-catalog-venues.query';
import { ListCatalogEventsQuery } from './dto/list-catalog-events.query';
import { GetVenueOccupancyQuery } from './dto/get-venue-occupancy.query';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator';

class CreateForumPostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(280)
  body!: string;
}

// Endpoints públicos sin auth = mayor superficie de tráfico/abuso. Rate limit
// propio (30/min por IP) más estricto que el global, y Cache-Control para que
// CDN/navegador absorban los hits repetidos sin tocar Postgres.
const PUBLIC_THROTTLE = { default: { ttl: 60_000, limit: 30 } };

@Controller('catalog')
@Throttle(PUBLIC_THROTTLE)
export class CatalogController {
  constructor(private readonly service: CatalogService) {}

  @Get('venues')
  @Header('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=60')
  listVenues(@Query() query: ListCatalogVenuesQuery) {
    return this.service.listVenues(query);
  }

  @Get('venues/:slug')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=120')
  getVenue(@Param('slug') slug: string) {
    return this.service.getVenueBySlug(slug);
  }

  @Get('venues/:id/occupancy')
  @Header('Cache-Control', 'public, max-age=15, s-maxage=30')
  getVenueOccupancy(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetVenueOccupancyQuery,
  ) {
    return this.service.getVenueOccupancy(id, query.windowMinutes);
  }

  @Get('promoters/:slug')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=120')
  getPromoter(@Param('slug') slug: string) {
    return this.service.getPromoterBySlug(slug);
  }

  @Get('events')
  @Header('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=60')
  listEvents(@Query() query: ListCatalogEventsQuery) {
    return this.service.listCatalogEvents(query);
  }

  @Get('events/:id')
  @Header('Cache-Control', 'public, max-age=15, s-maxage=30')
  getEvent(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getEventById(id);
  }

  @Get('tiers/:tierId')
  @Header('Cache-Control', 'public, max-age=30, s-maxage=60')
  getTier(@Param('tierId', ParseUUIDPipe) tierId: string) {
    return this.service.getTierById(tierId);
  }

  @Get('stats')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=120')
  getStats() {
    return this.service.getPublicStats();
  }

  @Get('sitemap')
  @Header('Cache-Control', 'public, max-age=3600, s-maxage=3600')
  getSitemap() {
    return this.service.getSitemapFeed();
  }

  @Get('events/:id/forum')
  @UseGuards(JwtAuthGuard)
  listForum(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.listForumPosts(id);
  }

  @Post('events/:id/forum')
  @UseGuards(JwtAuthGuard)
  createForumPost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateForumPostDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createForumPost(id, user.id, dto.body);
  }
}
