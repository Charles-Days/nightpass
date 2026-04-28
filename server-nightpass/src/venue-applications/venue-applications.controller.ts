import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator';
import { CreateApplicationDto } from './dto/create-application.dto';
import { RejectApplicationDto } from './dto/reject-application.dto';
import { ListApplicationsQuery } from './dto/list-applications.query';
import { VenueApplicationsService } from './venue-applications.service';

const PUBLIC_SUBMIT_THROTTLE = { default: { ttl: 3_600_000, limit: 3 } }; // 3/hora por IP

@Controller('venue-applications')
export class VenueApplicationsController {
  constructor(private readonly service: VenueApplicationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle(PUBLIC_SUBMIT_THROTTLE)
  submit(@Body() dto: CreateApplicationDto) {
    return this.service.submit(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  list(@Query() query: ListApplicationsQuery) {
    return this.service.list(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.approve(id, user.id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectApplicationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.reject(id, dto, user.id);
  }
}
