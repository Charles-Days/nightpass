import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { PrismaService } from '../prisma/prisma.service';
import { CheckinVenueDto } from './dto/checkin-venue.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class LoyaltyCheckinController {
  constructor(
    private readonly loyalty: LoyaltyService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Self-service venue check-in via static QR. Throttled to avoid brute-force
   * over qrPayload (each guess costs ~1 DB hit + 1 HMAC).
   */
  @Post('me/loyalty/checkin')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 6 } })
  checkin(@CurrentUser() user: AuthUser, @Body() dto: CheckinVenueDto) {
    return this.loyalty.checkinVenue({
      userId: user.id,
      venueId: dto.venueId,
      qrPayload: dto.qrPayload,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
  }

  /**
   * Read the current checkin QR (does NOT rotate). Returns null when the
   * venue never generated one. Same auth as rotate.
   */
  @Get('venues/:id/checkin-qr')
  async getQr(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) venueId: string,
  ) {
    await this.assertCanManageVenueQr(user, venueId);
    return this.loyalty.getVenueCheckinQr(venueId);
  }

  /**
   * Rotate the static QR secret for a venue. ADMINs can rotate any venue;
   * VENUE_OWNERs can only rotate venues they own (checked via VenueOwner).
   * VENUE_STAFF cannot rotate — they only need to print/display the QR.
   */
  @Post('venues/:id/checkin-qr/rotate')
  @HttpCode(HttpStatus.OK)
  async rotate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) venueId: string,
  ) {
    await this.assertCanManageVenueQr(user, venueId);
    return this.loyalty.rotateVenueCheckinSecret(venueId);
  }

  private async assertCanManageVenueQr(
    user: AuthUser,
    venueId: string,
  ): Promise<void> {
    if (user.role === Role.ADMIN) return;
    if (user.role !== Role.VENUE_OWNER) {
      throw new ForbiddenException('No tienes permisos para este local');
    }
    const owner = await this.prisma.venueOwner.findUnique({
      where: { userId_venueId: { userId: user.id, venueId } },
    });
    if (!owner) {
      throw new ForbiddenException('No tienes permisos para este local');
    }
  }
}
