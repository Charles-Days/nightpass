import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MaintenanceService } from './maintenance.service';
import { SetMaintenanceDto } from './dto/set-maintenance.dto';

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  // Público: lo consulta el middleware del front en cada request. Límite alto
  // porque es un poll frecuente.
  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 600 } })
  getStatus() {
    return this.service.getStatus();
  }

  // Solo ADMIN: prende/apaga el modo mantenimiento al instante (sin redeploy).
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  setStatus(@Body() dto: SetMaintenanceDto) {
    return this.service.setStatus(dto.enabled, dto.message);
  }
}
