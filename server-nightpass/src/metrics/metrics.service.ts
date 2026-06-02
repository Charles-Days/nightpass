import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

const ALL_KEY = 'visits:uniq:all';
const dayKey = (d: string) => `visits:uniq:${d}`;
// Visitantes que además crearon cuenta (conversión del funnel web).
const CONV_ALL_KEY = 'convert:uniq:all';
const convDayKey = (d: string) => `convert:uniq:${d}`;
const DAILY_TTL_SECONDS = 60 * 60 * 24 * 90; // retener 90 días de claves diarias

export interface DailyCount {
  date: string;
  count: number;
}

export interface VisitorStats {
  today: number;
  allTime: number;
  last7: DailyCount[];
  // Conversión: visitantes únicos que crearon cuenta.
  conversions: {
    today: number;
    allTime: number;
    last7: DailyCount[];
  };
}

/**
 * Contador de visitantes ÚNICOS (no page views). El dedup real lo hace
 * HyperLogLog en Redis: añadir el mismo visitorId varias veces no incrementa
 * el conteo. ~12KB por clave, error ~0.8%. El visitorId lo provee el front
 * (cookie first-party np_vid, o hash IP+UA si no hay cookie).
 */
@Injectable()
export class MetricsService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // Bucketing por día en hora de México, NO UTC. En el VPS (UTC) un visitante
  // de domingo 19:00 MX caía en el bucket del lunes (lunes 01:00 UTC). México
  // no usa DST desde 2022 (UTC-6 fijo), así que restar 24h y formatear en esta
  // tz da días locales consecutivos correctos.
  private static readonly DAY_FMT = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  /** YYYY-MM-DD en hora de México. */
  private dayString(date = new Date()): string {
    return MetricsService.DAY_FMT.format(date);
  }

  async recordVisit(visitorId: string): Promise<void> {
    if (!visitorId) return;
    const key = dayKey(this.dayString());
    await this.redis
      .multi()
      .pfadd(key, visitorId)
      .expire(key, DAILY_TTL_SECONDS)
      .pfadd(ALL_KEY, visitorId)
      .exec();
  }

  /**
   * Marca que un visitante creó cuenta (conversión). Se llama al hacer signup
   * web con el mismo visitorId (cookie np_vid). HyperLogLog dedup → un visitante
   * solo cuenta una vez aunque cree varias cuentas/recargue.
   */
  async recordConversion(visitorId: string): Promise<void> {
    if (!visitorId) return;
    const key = convDayKey(this.dayString());
    await this.redis
      .multi()
      .pfadd(key, visitorId)
      .expire(key, DAILY_TTL_SECONDS)
      .pfadd(CONV_ALL_KEY, visitorId)
      .exec();
  }

  async getStats(): Promise<VisitorStats> {
    const now = Date.now();
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(this.dayString(new Date(now - i * 86_400_000)));
    }

    const pipeline = this.redis.multi();
    days.forEach((d) => pipeline.pfcount(dayKey(d)));
    pipeline.pfcount(ALL_KEY);
    days.forEach((d) => pipeline.pfcount(convDayKey(d)));
    pipeline.pfcount(CONV_ALL_KEY);
    const res = await pipeline.exec();

    const counts = (res ?? []).map(([, v]) => Number(v) || 0);
    // Layout: [7 visit days][visit all][7 conv days][conv all]
    const visitDays = counts.slice(0, days.length);
    const allTime = counts[days.length] ?? 0;
    const convDays = counts.slice(days.length + 1, days.length + 1 + days.length);
    const convAll = counts[days.length * 2 + 1] ?? 0;

    const toSeries = (arr: number[]) =>
      days.map((date, i) => ({ date, count: arr[i] ?? 0 })).reverse();

    return {
      today: visitDays[0] ?? 0,
      allTime,
      last7: toSeries(visitDays),
      conversions: {
        today: convDays[0] ?? 0,
        allTime: convAll,
        last7: toSeries(convDays),
      },
    };
  }
}
