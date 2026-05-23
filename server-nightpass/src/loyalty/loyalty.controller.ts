import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { LoyaltyService } from './loyalty.service';
import { LoyaltyHistoryQuery } from './dto/loyalty-history.query';
import { AdminAdjustDto } from './dto/admin-adjust.dto';

@Controller()
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get('me/loyalty')
  @UseGuards(JwtAuthGuard)
  getMyStatus(@CurrentUser() user: AuthUser) {
    return this.loyalty.getMyStatus(user.id);
  }

  @Get('me/loyalty/history')
  @UseGuards(JwtAuthGuard)
  getMyHistory(
    @CurrentUser() user: AuthUser,
    @Query() query: LoyaltyHistoryQuery,
  ) {
    return this.loyalty.getMyHistory(user.id, query.limit);
  }

  @Get('leaderboard/city/:city')
  @UseGuards(JwtAuthGuard)
  getCityLeaderboard(@Param('city') city: string) {
    return this.loyalty.getCityLeaderboard(city);
  }

  @Post('admin/loyalty/adjust')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async adminAdjust(
    @Body() dto: AdminAdjustDto,
    @CurrentUser() admin: AuthUser,
  ) {
    await this.loyalty.adminAdjust(dto.userId, dto.points, dto.reason, admin.id);
    return { ok: true };
  }
}
