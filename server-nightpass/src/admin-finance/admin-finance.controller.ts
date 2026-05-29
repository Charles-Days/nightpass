import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminFinanceService } from './admin-finance.service';
import { FinanceQueryDto } from './dto/finance-query.dto';

@Controller('admin/finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminFinanceController {
  constructor(private readonly service: AdminFinanceService) {}

  @Get('stats')
  @Roles(Role.ADMIN)
  getStats(@Query() query: FinanceQueryDto) {
    return this.service.getStats(query);
  }
}
