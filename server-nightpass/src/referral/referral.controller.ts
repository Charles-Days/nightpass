import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { ReferralService } from './referral.service';
import { ClaimReferralDto } from './dto/claim-referral.dto';
import { VisitReferralDto } from './dto/visit-referral.dto';

@Controller()
export class ReferralController {
  constructor(private readonly referral: ReferralService) {}

  /** Mi código de invitación + cuántos referí y NPP ganados. */
  @Get('me/referral')
  @UseGuards(JwtAuthGuard)
  getMyReferral(@CurrentUser() user: AuthUser) {
    return this.referral.getMyReferral(user.id);
  }

  /** Público: registra que alguien abrió un link de invitación. */
  @Post('referral/visit')
  @HttpCode(HttpStatus.OK)
  recordVisit(@Body() dto: VisitReferralDto) {
    return this.referral.recordVisit(dto.code, dto.visitorId, dto.eventId);
  }

  /** El invitado reclama su atribución tras crear cuenta (autenticado). */
  @Post('referral/claim')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  claim(@CurrentUser() user: AuthUser, @Body() dto: ClaimReferralDto) {
    return this.referral.claim(user.id, dto.code, dto.eventId);
  }
}
