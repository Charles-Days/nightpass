import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { CashWalletService, OwnerRef } from './cash-wallet.service';
import { TopupDto } from './dto/topup.dto';
import { AdjustDto } from './dto/adjust.dto';

/** Convierte venueId/promoterId (exactamente uno) en un OwnerRef tipado. */
function toOwnerRef(input: {
  venueId?: string;
  promoterId?: string;
}): OwnerRef {
  if (input.venueId && input.promoterId) {
    throw new BadRequestException('Envía venueId o promoterId, no ambos');
  }
  if (input.venueId) return { venueId: input.venueId };
  if (input.promoterId) return { promoterId: input.promoterId };
  throw new BadRequestException('Falta venueId o promoterId');
}

@Controller('cash-wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashWalletController {
  constructor(private readonly service: CashWalletService) {}

  @Get()
  @Roles(Role.ADMIN, Role.VENUE_OWNER, Role.PROMOTER)
  getWallet(
    @CurrentUser() user: AuthUser,
    @Query('venueId') venueId?: string,
    @Query('promoterId') promoterId?: string,
  ) {
    return this.service.getView(user, toOwnerRef({ venueId, promoterId }));
  }

  @Post('topup')
  @Roles(Role.ADMIN, Role.VENUE_OWNER, Role.PROMOTER)
  @HttpCode(HttpStatus.OK)
  topup(@CurrentUser() user: AuthUser, @Body() dto: TopupDto) {
    return this.service.createTopup(
      user,
      toOwnerRef(dto),
      dto.amountCents,
    );
  }

  @Post('adjust')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  adjust(@Body() dto: AdjustDto) {
    return this.service.adminAdjust(toOwnerRef(dto), dto.amountCents, dto.note);
  }
}
