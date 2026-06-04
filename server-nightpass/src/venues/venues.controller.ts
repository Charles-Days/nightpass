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
import { AssignOwnerDto } from './dto/assign-owner.dto';
import { VenuesService } from './venues.service';
import { Delete } from '@nestjs/common';

@Controller('venues')
export class VenuesController {
  constructor(private readonly service: VenuesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateVenueDto) {
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VENUE_OWNER, Role.VENUE_STAFF)
  list(@Query() query: ListVenuesQuery) {
    return this.service.list(query);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER, Role.VENUE_STAFF)
  getMyVenues(@CurrentUser() user: AuthUser) {
    return this.service.getMyVenues(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VENUE_OWNER, Role.VENUE_STAFF)
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getById(id, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VENUE_OWNER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVenueDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Post(':id/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  suspend(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.suspend(id);
  }

  @Post(':id/reactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.reactivate(id);
  }

  @Post(':id/feature')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  feature(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string } = {},
  ) {
    return this.service.setFeatured(id, true, body.reason);
  }

  @Post(':id/unfeature')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  unfeature(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.setFeatured(id, false);
  }

  @Post(':id/platform-fee')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  setPlatformFee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { platformFeePct: number | null },
  ) {
    const pct =
      body.platformFeePct === null || body.platformFeePct === undefined
        ? null
        : Number(body.platformFeePct);
    return this.service.setPlatformFee(id, pct);
  }

  @Post(':id/cash-commission')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  setCashCommission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { exempt: boolean },
  ) {
    return this.service.setCashCommissionExempt(id, body.exempt === true);
  }

  @Post(':id/owners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  assignOwner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignOwnerDto,
  ) {
    return this.service.assignOwner(id, dto);
  }

  @Delete(':id/owners/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  removeOwner(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.service.removeOwner(id, userId);
  }
}
