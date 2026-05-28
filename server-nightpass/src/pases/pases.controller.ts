import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
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
import { PasesService } from './pases.service';
import { PasesQueryDto } from './dto/pases-query.dto';
import { ExportCsvQueryDto } from './dto/export-csv-query.dto';

interface CsvReply {
  header(name: string, value: string): CsvReply;
  send(payload: string): void;
}

@Controller('pases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PasesController {
  constructor(private readonly service: PasesService) {}

  @Get('venues/:venueId/stats')
  @Roles(Role.ADMIN, Role.VENUE_OWNER, Role.VENUE_STAFF)
  getStats(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Query() query: PasesQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getVenueStats(venueId, query, user);
  }

  @Get('venues/:venueId/events/:eventId')
  @Roles(Role.ADMIN, Role.VENUE_OWNER, Role.VENUE_STAFF)
  getEventDrilldown(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: PasesQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getEventDrilldown(venueId, eventId, query, user);
  }

  @Get('venues/:venueId/export.csv')
  @Roles(Role.ADMIN, Role.VENUE_OWNER, Role.VENUE_STAFF)
  async exportCsv(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Query() query: ExportCsvQueryDto,
    @CurrentUser() user: AuthUser,
    @Res() reply: CsvReply,
  ) {
    const { filename, body } = await this.service.exportCsv(
      venueId,
      query,
      user,
    );
    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(body);
  }
}
