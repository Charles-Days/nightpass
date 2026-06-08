import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { PassesService } from './passes.service';
import { ClaimPassDto } from './dto/claim-pass.dto';
import { ScanPassDto } from './dto/scan-pass.dto';
import { ListMineQueryDto } from './dto/list-mine-query.dto';

// Sin guard a nivel clase: la vista previa de transferencia (`GET
// transfers/:token`) es PÚBLICA para que el destinatario vea el pase ANTES de
// iniciar sesión. El resto de rutas declara su guard explícito.
@Controller('passes')
export class PassesController {
  constructor(private readonly service: PassesService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser() user: AuthUser, @Query() query: ListMineQueryDto) {
    return this.service.listMine(user.id, {
      page: query.page,
      limit: query.limit,
    });
  }

  @Post('scan')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VENUE_OWNER, Role.VENUE_STAFF, Role.RP)
  scan(@Body() dto: ScanPassDto, @CurrentUser() user: AuthUser) {
    return this.service.scan(dto.qrCode, user);
  }

  // El cliente escanea el QR emitido por un RP y reclama su pase.
  @Post('claim')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  claim(@Body() dto: ClaimPassDto, @CurrentUser() user: AuthUser) {
    return this.service.claim(dto.code, user);
  }

  // ── Transferencia de pases ──────────────────────────────────────────────

  // El dueño genera un link de transferencia para ceder su pase.
  @Post(':id/transfer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  createTransfer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createTransfer(id, user);
  }

  // El dueño cancela su transferencia pendiente.
  @Delete(':id/transfer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  cancelTransfer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.cancelTransfer(id, user);
  }

  // PÚBLICO — la abre el destinatario, puede no tener sesión todavía.
  @Get('transfers/:token')
  getTransfer(@Param('token') token: string) {
    return this.service.getTransferByToken(token);
  }

  // PÚBLICO — vista previa de un vale por link, antes de iniciar sesión.
  @Get('claims/:token')
  getClaim(@Param('token') token: string) {
    return this.service.getClaimByToken(token);
  }

  // El destinatario acepta la transferencia → el pase pasa a su nombre.
  @Post('transfers/:token/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  acceptTransfer(
    @Param('token') token: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.acceptTransfer(token, user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getById(id, user);
  }
}
