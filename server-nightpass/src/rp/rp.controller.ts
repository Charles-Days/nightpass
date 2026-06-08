import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateRpDto } from './dto/create-rp.dto';
import { UpdateRpZoneDto } from './dto/update-rp-zone.dto';
import { ListRpQuery } from './dto/list-rp.query';
import { SetCommissionRuleDto } from './dto/set-commission-rule.dto';
import { IssuePassDto } from './dto/issue-pass.dto';
import { CreatePickupPointDto } from './dto/create-pickup-point.dto';
import { UpdatePickupPointDto } from './dto/update-pickup-point.dto';
import { ResolveMapsDto } from './dto/resolve-maps.dto';
import { RpService } from './rp.service';

@Controller('rp')
export class RpController {
  constructor(private readonly service: RpService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateRpDto) {
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  list(@Query() query: ListRpQuery) {
    return this.service.list(query);
  }

  @Get('resolve/:code')
  resolveCode(@Param('code') code: string) {
    return this.service.resolveCode(code);
  }

  // Desglose por evento de comisiones/ventas/ganancias de cada RP (gestión).
  @Get('events/:eventId/breakdown')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  eventBreakdown(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.service.getEventRpBreakdown(eventId);
  }

  @Get('promoter/events/:eventId/breakdown')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROMOTER)
  eventBreakdownForPromoter(
    @CurrentUser() user: AuthUser,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.service.getEventRpBreakdownForPromoter(user.id, eventId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RP)
  async getMe(@CurrentUser() user: AuthUser) {
    const rp = await this.service.getByUserId(user.id);
    return this.service.getById(rp.id);
  }

  @Get('me/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RP)
  async getMeStats(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const rp = await this.service.getByUserId(user.id);
    return this.service.getStats(rp.id, from, to);
  }

  // ── Vales en efectivo emitidos por el RP ───────────────────────────────────
  // Rutas estáticas ('passes/...') priorizadas sobre el param `:id` de abajo.

  @Post('passes/issue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RP)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @HttpCode(HttpStatus.CREATED)
  issuePass(@CurrentUser() user: AuthUser, @Body() dto: IssuePassDto) {
    return this.service.issuePass(user.id, dto);
  }

  @Get('passes/issued')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RP)
  listIssuedPasses(@CurrentUser() user: AuthUser) {
    return this.service.listIssuedPasses(user.id);
  }

  @Post('passes/:claimId/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RP)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @HttpCode(HttpStatus.OK)
  cancelIssuedPass(
    @CurrentUser() user: AuthUser,
    @Param('claimId', ParseUUIDPipe) claimId: string,
  ) {
    return this.service.cancelIssuedPass(user.id, claimId);
  }

  // ── Puntos de cobro del RP ─────────────────────────────────────────────────
  // Rutas estáticas ('pickup-points/...') priorizadas sobre el param `:id`.

  @Get('pickup-points')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RP)
  listPickupPoints(@CurrentUser() user: AuthUser) {
    return this.service.listPickupPoints(user.id);
  }

  @Post('pickup-points')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RP)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @HttpCode(HttpStatus.CREATED)
  createPickupPoint(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePickupPointDto,
  ) {
    return this.service.createPickupPoint(user.id, dto);
  }

  // Resuelve un link de Maps a coords para previsualizar en el mapa al pegarlo.
  // Lo usan el RP, el admin y el organizador (no requiere scope de rp).
  @Post('pickup-points/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RP, Role.ADMIN, Role.PROMOTER)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @HttpCode(HttpStatus.OK)
  resolvePickupLink(@Body() dto: ResolveMapsDto) {
    return this.service.resolvePickupLink(dto.url);
  }

  @Patch('pickup-points/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RP)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @HttpCode(HttpStatus.OK)
  updatePickupPoint(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePickupPointDto,
  ) {
    return this.service.updatePickupPoint(user.id, id, dto);
  }

  @Delete('pickup-points/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.RP)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @HttpCode(HttpStatus.OK)
  deletePickupPoint(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.deletePickupPoint(user.id, id);
  }

  // ── RPs gestionados por el organizador (scoped a su propio promoter) ───────
  // Estas rutas son estáticas en su primer segmento ('promoter'), por lo que el
  // router de Fastify las prioriza sobre el param `:id` de abajo.

  @Get('promoter/mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROMOTER)
  listMine(@CurrentUser() user: AuthUser, @Query() query: ListRpQuery) {
    return this.service.listForPromoter(user.id, query);
  }

  @Post('promoter/mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROMOTER)
  @HttpCode(HttpStatus.CREATED)
  createMine(@CurrentUser() user: AuthUser, @Body() dto: CreateRpDto) {
    return this.service.createForPromoter(user.id, dto);
  }

  @Get('promoter/mine/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROMOTER)
  getMineOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getByIdForPromoter(user.id, id);
  }

  // Puntos de cobro de un RP de mi organización (organizador).
  @Get('promoter/mine/:id/pickup-points')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROMOTER)
  listMinePickupPoints(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.listPickupPointsForPromoter(user.id, id);
  }

  @Post('promoter/mine/:id/pickup-points')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROMOTER)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @HttpCode(HttpStatus.CREATED)
  createMinePickupPoint(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePickupPointDto,
  ) {
    return this.service.createPickupPointForPromoter(user.id, id, dto);
  }

  @Patch('promoter/mine/:id/pickup-points/:pointId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROMOTER)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @HttpCode(HttpStatus.OK)
  updateMinePickupPoint(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pointId', ParseUUIDPipe) pointId: string,
    @Body() dto: UpdatePickupPointDto,
  ) {
    return this.service.updatePickupPointForPromoter(user.id, id, pointId, dto);
  }

  @Delete('promoter/mine/:id/pickup-points/:pointId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROMOTER)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @HttpCode(HttpStatus.OK)
  deleteMinePickupPoint(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pointId', ParseUUIDPipe) pointId: string,
  ) {
    return this.service.deletePickupPointForPromoter(user.id, id, pointId);
  }

  @Get('promoter/mine/:id/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROMOTER)
  getMineStats(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getStatsForPromoter(user.id, id, from, to);
  }

  @Patch('promoter/mine/:id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROMOTER)
  @HttpCode(HttpStatus.OK)
  toggleMineActive(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.toggleActiveForPromoter(user.id, id);
  }

  @Post('promoter/mine/:id/commission-rules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROMOTER)
  @HttpCode(HttpStatus.OK)
  setMineCommissionRule(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCommissionRuleDto,
  ) {
    return this.service.setCommissionRuleForPromoter(user.id, id, dto);
  }

  @Get('promoter/mine/:id/commission-rules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROMOTER)
  getMineCommissionRules(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getCommissionRulesForPromoter(user.id, id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.RP)
  async getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    if (user.role === Role.RP) {
      const ownProfile = await this.service.getByUserId(user.id);
      if (ownProfile.id !== id) {
        throw new ForbiddenException('No tienes permiso para acceder a este perfil');
      }
    }
    return this.service.getById(id);
  }

  @Patch(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.toggleActive(id);
  }

  // Puntos de cobro de cualquier RP (admin general).
  @Get(':id/pickup-points')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listRpPickupPoints(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.listPickupPointsForAdmin(id);
  }

  @Post(':id/pickup-points')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @HttpCode(HttpStatus.CREATED)
  createRpPickupPoint(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePickupPointDto,
  ) {
    return this.service.createPickupPointForAdmin(id, dto);
  }

  @Patch(':id/pickup-points/:pointId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @HttpCode(HttpStatus.OK)
  updateRpPickupPoint(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pointId', ParseUUIDPipe) pointId: string,
    @Body() dto: UpdatePickupPointDto,
  ) {
    return this.service.updatePickupPointForAdmin(id, pointId, dto);
  }

  @Delete(':id/pickup-points/:pointId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @HttpCode(HttpStatus.OK)
  deleteRpPickupPoint(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('pointId', ParseUUIDPipe) pointId: string,
  ) {
    return this.service.deletePickupPointForAdmin(id, pointId);
  }

  @Patch(':id/zone')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.RP)
  @HttpCode(HttpStatus.OK)
  async updateZone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRpZoneDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.role === Role.RP) {
      const own = await this.service.getByUserId(user.id);
      if (own.id !== id) {
        throw new ForbiddenException('No puedes editar este perfil');
      }
    }
    return this.service.updateZone(id, dto);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.RP)
  async getStats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (user.role === Role.RP) {
      const ownProfile = await this.service.getByUserId(user.id);
      if (ownProfile.id !== id) {
        throw new ForbiddenException('No tienes permiso para acceder a este perfil');
      }
    }
    return this.service.getStats(id, from, to);
  }

  @Post(':id/commission-rules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  setCommissionRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetCommissionRuleDto,
  ) {
    return this.service.setCommissionRule(id, dto);
  }

  @Get(':id/commission-rules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.RP)
  async getCommissionRules(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.role === Role.RP) {
      const ownProfile = await this.service.getByUserId(user.id);
      if (ownProfile.id !== id) {
        throw new ForbiddenException('No tienes permiso para acceder a este perfil');
      }
    }
    return this.service.getCommissionRules(id);
  }

  @Delete(':id/commission-rules/:ruleId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  deleteCommissionRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
  ) {
    return this.service.deleteCommissionRule(ruleId);
  }
}
