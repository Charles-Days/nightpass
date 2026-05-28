import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ListEventsQuery } from './dto/list-events.query';
import { CreateTierDto } from './dto/create-tier.dto';
import { UpdateTierDto } from './dto/update-tier.dto';

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.VENUE_OWNER, Role.PROMOTER)
export class EventsController {
  constructor(private readonly service: EventsService) {}

  @Get()
  @Roles(
    Role.ADMIN,
    Role.VENUE_OWNER,
    Role.VENUE_STAFF,
    Role.PROMOTER,
    Role.PROMOTER_STAFF,
  )
  list(@Query() query: ListEventsQuery, @CurrentUser() user: AuthUser) {
    return this.service.list(query, user);
  }

  @Post()
  create(@Body() dto: CreateEventDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }

  @Post(':id/feature')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  feature(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string } = {},
  ) {
    return this.service.setFeatured(id, true, body.reason);
  }

  @Post(':id/unfeature')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  unfeature(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.setFeatured(id, false);
  }

  @Post(':id/tiers')
  createTier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTierDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createTier(id, dto, user);
  }

  @Patch(':id/tiers/:tierId')
  updateTier(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @Body() dto: UpdateTierDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateTier(id, tierId, dto, user);
  }

  @Delete(':id/tiers/:tierId')
  @HttpCode(HttpStatus.OK)
  removeTier(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tierId', ParseUUIDPipe) tierId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeTier(id, tierId, user);
  }
}
