import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { LocationsService } from './locations.service';
import { RecordLocationDto } from './dto/record-location.dto';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  /**
   * Record a single ping. Throttled to 30/min/user to bound DB write volume
   * even if a buggy client tries to spam the endpoint.
   */
  @Post('location')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async record(
    @CurrentUser() user: AuthUser,
    @Body() dto: RecordLocationDto,
  ): Promise<void> {
    await this.service.record(user.id, dto);
  }

  /**
   * Forget every ping for this user + reset onboarding flag.
   * Returns 204 — no body.
   */
  @Delete('locations')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAll(@CurrentUser() user: AuthUser): Promise<void> {
    await this.service.deleteAllForUser(user.id);
  }
}
