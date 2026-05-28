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
import { CreatePromoterApplicationDto } from './dto/create-promoter-application.dto';
import { RejectPromoterApplicationDto } from './dto/reject-promoter-application.dto';
import { ListPromoterApplicationsQuery } from './dto/list-promoter-applications.query';
import { PromoterApplicationsService } from './promoter-applications.service';

const PUBLIC_SUBMIT_THROTTLE = { default: { ttl: 3_600_000, limit: 3 } }; // 3/hora por IP

@Controller('promoter-applications')
export class PromoterApplicationsController {
  constructor(private readonly service: PromoterApplicationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle(PUBLIC_SUBMIT_THROTTLE)
  submit(@Body() dto: CreatePromoterApplicationDto) {
    return this.service.submit(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  list(@Query() query: ListPromoterApplicationsQuery) {
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
    @Body() dto: RejectPromoterApplicationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.reject(id, dto, user.id);
  }
}
