import {
  Body,
  Controller,
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
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { ListVenuesQuery } from './dto/list-venues.query';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { VenuesService } from './venues.service';

@Controller('venues')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VenuesController {
  constructor(private readonly service: VenuesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateVenueDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN)
  list(@Query() query: ListVenuesQuery) {
    return this.service.list(query);
  }

  @Get('my')
  @Roles(Role.VENUE_OWNER, Role.VENUE_STAFF)
  getMyVenues(@CurrentUser() user: AuthUser) {
    return this.service.getMyVenues(user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.VENUE_OWNER, Role.VENUE_STAFF)
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.VENUE_OWNER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVenueDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Post(':id/suspend')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  suspend(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.suspend(id);
  }

  @Post(':id/reactivate')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.reactivate(id);
  }
}
