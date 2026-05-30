import {
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
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminPassesService } from './admin-passes.service';
import { AdminGeneratePassDto } from './dto/admin-generate-pass.dto';

@Controller('admin/passes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminPassesController {
  constructor(private readonly service: AdminPassesService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  generate(@CurrentUser() user: AuthUser, @Body() dto: AdminGeneratePassDto) {
    return this.service.generatePass(user.id, dto);
  }

  @Get('issued')
  listIssued(@Query('eventId') eventId?: string) {
    return this.service.listIssuedPasses(eventId);
  }
}
