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
import { PhysicalPaymentRequestStatus, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { PhysicalPaymentsService } from './physical-payments.service';
import { CreatePhysicalPaymentDto } from './dto/create-physical-payment.dto';

@Controller('physical-payments')
@UseGuards(JwtAuthGuard)
export class PhysicalPaymentsController {
  constructor(private readonly service: PhysicalPaymentsService) {}

  // Cliente: crea solicitud de pago en efectivo.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePhysicalPaymentDto,
  ) {
    return this.service.createRequest(user.id, dto);
  }

  // Cliente: mis solicitudes.
  @Get('me')
  listMine(@CurrentUser() user: AuthUser) {
    return this.service.listMine(user.id);
  }

  // RP: cola de solicitudes de sus eventos asignados.
  @Get('rp')
  @UseGuards(RolesGuard)
  @Roles(Role.RP)
  listForRp(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: PhysicalPaymentRequestStatus,
  ) {
    return this.service.listForRp(user.id, status);
  }

  // Admin: todas las solicitudes (opcional por evento).
  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  listForAdmin(@Query('eventId') eventId?: string) {
    return this.service.listForAdmin(eventId);
  }

  // RP: confirma cobro en efectivo → emite los pases al cliente.
  @Post(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles(Role.RP)
  @HttpCode(HttpStatus.OK)
  confirm(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.confirm(user.id, id);
  }

  // Cancelar (cliente dueño, RP asignado o admin).
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.cancel(user, id);
  }
}
