import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
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
import { PrismaService } from '../prisma/prisma.service';
import { PasesService } from '../pases/pases.service';
import { PasesQueryDto } from '../pases/dto/pases-query.dto';
import { PromotersService } from './promoters.service';
import { CreatePromoterDto } from './dto/create-promoter.dto';
import { AdminUpdatePromoterDto } from './dto/admin-update-promoter.dto';
import { UpdatePromoterDto } from './dto/update-promoter.dto';
import { InvitePromoterStaffDto } from './dto/invite-promoter-staff.dto';
import { ListPromotersQuery } from './dto/list-promoters.query';

@Controller('promoters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromotersController {
  constructor(
    private readonly service: PromotersService,
    private readonly pases: PasesService,
    private readonly prisma: PrismaService,
  ) {}

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

  @Get('me/stats')
  @Roles(Role.PROMOTER, Role.PROMOTER_STAFF)
  async getMyStats(
    @CurrentUser() user: AuthUser,
    @Query() query: PasesQueryDto,
  ) {
    const membership = await this.prisma.promoterMember.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });
    if (!membership) throw new NotFoundException('Organizador no encontrado');
    return this.pases.getPromoterStats(membership.promoterId, query, user);
  }

  @Get()
  @Roles(Role.ADMIN)
  list(@Query() query: ListPromotersQuery) {
    return this.service.listAdmin(query);
  }

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePromoterDto) {
    return this.service.createByAdmin(dto);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getByIdAdmin(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdatePromoterDto,
  ) {
    return this.service.updateAdmin(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteAdmin(id);
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

  @Post(':id/platform-fee')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  setPlatformFee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { platformFeePct: number },
  ) {
    return this.service.setPlatformFee(id, Number(body.platformFeePct));
  }
}
