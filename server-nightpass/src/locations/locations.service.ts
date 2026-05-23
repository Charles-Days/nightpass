import { Injectable, Logger } from '@nestjs/common';
import { LocationPing } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { haversineMeters } from '../common/geo';
import { RecordLocationDto } from './dto/record-location.dto';

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persist a fresh ping. Coordinates are NOT logged (privacy).
   */
  async record(userId: string, dto: RecordLocationDto): Promise<LocationPing> {
    const ping = await this.prisma.locationPing.create({
      data: {
        userId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracyM: dto.accuracyM,
        source: dto.source,
      },
    });
    this.logger.debug(
      `ping recorded user=${userId} source=${dto.source} accuracy=${dto.accuracyM ?? 'n/a'}`,
    );
    return ping;
  }

  /**
   * Wipe every ping for a user AND reset their onboarding flag, so the
   * client UI re-prompts the location consent the next time they open the app.
   * Used by `DELETE /me/locations` ("borrar mis ubicaciones" / GDPR).
   */
  async deleteAllForUser(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.locationPing.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { locationOnboardedAt: null },
      }),
    ]);
    this.logger.log(`Pings + onboarding cleared for user=${userId}`);
  }

  /**
   * Most recent ping within `maxAgeMin` for this user, or `null`.
   * Used by the redeem flow to verify the customer is actually nearby.
   */
  async findRecentForUser(
    userId: string,
    maxAgeMin = 10,
  ): Promise<LocationPing | null> {
    const cutoff = new Date(Date.now() - maxAgeMin * 60_000);
    return this.prisma.locationPing.findFirst({
      where: { userId, createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Count DISTINCT users with at least one ping inside `radiusM` of (lat,lng)
   * during the last `windowMin` minutes. Uses a bounding box pre-filter so
   * Postgres can use the createdAt index, then refines via Haversine in JS.
   */
  async countNearbyUsers(
    venueLat: number,
    venueLng: number,
    radiusM: number,
    windowMin: number,
  ): Promise<number> {
    if (radiusM <= 0) return 0;

    const cutoff = new Date(Date.now() - windowMin * 60_000);

    // Bounding box: 1 degree of latitude ~ 111_320 m. Slightly inflated radius
    // so Postgres won't drop edge pings that the Haversine check might keep.
    const padded = radiusM * 1.05;
    const dLat = padded / 111_320;
    const cosLat = Math.cos((venueLat * Math.PI) / 180);
    const dLng = cosLat === 0 ? padded : padded / (111_320 * Math.abs(cosLat));

    const candidates = await this.prisma.locationPing.findMany({
      where: {
        createdAt: { gte: cutoff },
        latitude: { gte: venueLat - dLat, lte: venueLat + dLat },
        longitude: { gte: venueLng - dLng, lte: venueLng + dLng },
      },
      select: { userId: true, latitude: true, longitude: true },
    });

    const insiders = new Set<string>();
    for (const ping of candidates) {
      const meters = haversineMeters(
        ping.latitude,
        ping.longitude,
        venueLat,
        venueLng,
      );
      if (meters <= radiusM) insiders.add(ping.userId);
    }
    return insiders.size;
  }
}
