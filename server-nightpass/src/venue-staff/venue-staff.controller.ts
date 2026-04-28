import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { VenueStaffService } from './venue-staff.service';
import { InviteStaffDto } from './dto/invite-staff.dto';

@Controller('venues/:venueId/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VenueStaffController {
  constructor(private readonly venueStaffService: VenueStaffService) {}

  @Post()
  @Roles(Role.ADMIN, Role.VENUE_OWNER)
  invite(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() dto: InviteStaffDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.venueStaffService.invite(venueId, dto, user.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.VENUE_OWNER)
  list(@Param('venueId', ParseUUIDPipe) venueId: string) {
    return this.venueStaffService.list(venueId);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.VENUE_OWNER)
  async revoke(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.venueStaffService.revoke(venueId, userId);
    return { ok: true };
  }
}
