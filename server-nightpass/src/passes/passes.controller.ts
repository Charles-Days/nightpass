import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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

@Controller('passes')
@UseGuards(JwtAuthGuard)
export class PassesController {
  constructor(private readonly service: PassesService) {}

  @Get('me')
  listMine(@CurrentUser() user: AuthUser) {
    return this.service.listMine(user.id);
  }

  @Post('scan')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.VENUE_OWNER, Role.VENUE_STAFF)
  scan(@Body() dto: ScanPassDto, @CurrentUser() user: AuthUser) {
    return this.service.scan(dto.qrCode, user);
  }

  // El cliente escanea el QR emitido por un RP y reclama su pase.
  @Post('claim')
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  claim(@Body() dto: ClaimPassDto, @CurrentUser() user: AuthUser) {
    return this.service.claim(dto.code, user);
  }

  // ── Transferencia de pases ──────────────────────────────────────────────

  // El dueño genera un link de transferencia para ceder su pase.
  @Post(':id/transfer')
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  createTransfer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createTransfer(id, user);
  }

  // El dueño cancela su transferencia pendiente.
  @Delete(':id/transfer')
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  cancelTransfer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.cancelTransfer(id, user);
  }

  // Vista previa de una transferencia por token (la abre el destinatario).
  @Get('transfers/:token')
  getTransfer(@Param('token') token: string, @CurrentUser() user: AuthUser) {
    return this.service.getTransferByToken(token, user);
  }

  // El destinatario acepta la transferencia → el pase pasa a su nombre.
  @Post('transfers/:token/accept')
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  acceptTransfer(
    @Param('token') token: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.acceptTransfer(token, user);
  }

  @Get(':id')
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getById(id, user);
  }
}
