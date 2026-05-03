import {
  Body,
  Controller,
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

  @Get(':id')
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getById(id, user);
  }
}
