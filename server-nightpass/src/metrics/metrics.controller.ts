import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MetricsService } from './metrics.service';
import { RecordVisitDto } from './dto/record-visit.dto';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly service: MetricsService) {}

  // Público: el front manda 1 beacon por sesión con el visitorId. El dedup lo
  // hace el HyperLogLog, así que recargar no recuenta.
  @Post('visit')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async visit(@Body() dto: RecordVisitDto): Promise<void> {
    await this.service.recordVisit(dto.visitorId);
  }

  // Solo ADMIN: visitantes únicos de hoy, all-time y últimos 7 días.
  @Get('visitors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getVisitors() {
    return this.service.getStats();
  }
}
