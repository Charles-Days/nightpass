import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Hourly cron that drops every LocationPing older than 24h.
 * Pings are ephemeral signal for live occupancy — we never want them around
 * long enough to build a movement history of a user.
 */
@Injectable()
export class LocationsCleanup {
  private readonly logger = new Logger(LocationsCleanup.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async purgeOldPings(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await this.prisma.locationPing.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (result.count > 0) {
      this.logger.log(`Purged ${result.count} location pings older than 24h`);
    }
  }
}
