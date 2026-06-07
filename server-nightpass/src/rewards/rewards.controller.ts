import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { RewardsService } from './rewards.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { UseRedemptionDto } from './dto/use-redemption.dto';
import {
  AvailableRewardsQuery,
  OwnerRewardsQuery,
} from './dto/list-rewards.query';

const OWNER_ROLES = [
  Role.VENUE_OWNER,
  Role.VENUE_STAFF,
  Role.PROMOTER,
  Role.PROMOTER_STAFF,
  Role.ADMIN,
] as const;

@Controller()
export class RewardsController {
  constructor(private readonly rewards: RewardsService) {}

  // ── Panel (dueño) ──────────────────────────────────────────────────────────

  @Post('rewards')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ROLES)
  create(@Body() dto: CreateRewardDto, @CurrentUser() user: AuthUser) {
    return this.rewards.create(dto, user);
  }

  @Get('rewards/mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ROLES)
  mine(@Query() query: OwnerRewardsQuery, @CurrentUser() user: AuthUser) {
    return this.rewards.listForOwner(user, query);
  }

  @Patch('rewards/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ROLES)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRewardDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.rewards.update(id, dto, user);
  }

  @Delete('rewards/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ROLES)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.rewards.remove(id, user);
  }

  // ── Cliente ────────────────────────────────────────────────────────────────

  @Get('rewards/available')
  @UseGuards(JwtAuthGuard)
  available(
    @Query() query: AvailableRewardsQuery,
    @CurrentUser() user: AuthUser,
  ) {
    return this.rewards.listAvailable(user.id, query);
  }

  @Post('rewards/:id/redeem')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  redeem(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.rewards.redeem(user.id, id);
  }

  @Get('me/redemptions')
  @UseGuards(JwtAuthGuard)
  myRedemptions(@CurrentUser() user: AuthUser) {
    return this.rewards.myRedemptions(user.id);
  }

  // ── Validación en puerta/barra (staff) ──────────────────────────────────────

  @Post('rewards/redemptions/use')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ROLES)
  @HttpCode(HttpStatus.OK)
  use(@Body() dto: UseRedemptionDto, @CurrentUser() user: AuthUser) {
    return this.rewards.useByCode(dto.code, user);
  }
}
