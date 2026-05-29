import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
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

  @Get('sitemap')
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
