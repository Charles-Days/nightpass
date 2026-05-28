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
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { PromotersService } from './promoters.service';
import { UpdatePromoterDto } from './dto/update-promoter.dto';
import { InvitePromoterStaffDto } from './dto/invite-promoter-staff.dto';
import { ListPromotersQuery } from './dto/list-promoters.query';

@Controller('promoters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromotersController {
  constructor(private readonly service: PromotersService) {}

  @Get('me')
  @Roles(Role.PROMOTER, Role.PROMOTER_STAFF)
  getMe(@CurrentUser() user: AuthUser) {
    return this.service.findByUser(user.id);
  }

  @Patch('me')
  @Roles(Role.PROMOTER)
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePromoterDto,
  ) {
    return this.service.updateOwn(user.id, dto);
  }

  @Post('me/staff')
  @Roles(Role.PROMOTER)
  @HttpCode(HttpStatus.CREATED)
  inviteStaff(
    @CurrentUser() user: AuthUser,
    @Body() dto: InvitePromoterStaffDto,
  ) {
    return this.service.inviteStaffByUser(user.id, dto);
  }

  @Get('me/staff')
  @Roles(Role.PROMOTER)
  listStaff(@CurrentUser() user: AuthUser) {
    return this.service.listStaffByUser(user.id);
  }

  @Delete('me/staff/:userId')
  @Roles(Role.PROMOTER)
  @HttpCode(HttpStatus.OK)
  revokeStaff(
    @CurrentUser() user: AuthUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.service.revokeStaffByUser(user.id, userId);
  }

  @Get()
  @Roles(Role.ADMIN)
  list(@Query() query: ListPromotersQuery) {
    return this.service.listAdmin(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getByIdAdmin(id);
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
