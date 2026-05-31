import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

/**
 * Blocklist de IPs en Redis — fail2ban casero. Cada vez que una IP excede el
 * rate limit (429) registramos una violación; superado el umbral dentro de la
 * ventana, la IP se bloquea (403) por un tiempo que escala con la reincidencia.
 *
 * Persistente y compartido entre instancias (a diferencia del contador en
 * memoria del throttler por defecto).
 */
@Injectable()
export class IpBlocklistService {
  private readonly logger = new Logger(IpBlocklistService.name);

  /** Ventana para acumular violaciones de rate limit. */
  private readonly WINDOW_SEC = 600; // 10 min
  /** Violaciones (429) dentro de la ventana que disparan el ban. */
  private readonly THRESHOLD = 10;
  /** Duración del ban según nivel de reincidencia: 5m, 30m, 2h, 24h. */
  private readonly BAN_LADDER_SEC = [300, 1800, 7200, 86400];
  /** Cuánto recordamos el nivel de reincidencia de una IP. */
  private readonly LEVEL_TTL_SEC = 86400; // 24h

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private banKey(ip: string) {
    return `sec:ban:${ip}`;
  }
  private violKey(ip: string) {
    return `sec:viol:${ip}`;
  }
  private levelKey(ip: string) {
    return `sec:banlvl:${ip}`;
  }

  /** Segundos restantes de ban, o 0 si no está baneada. */
  async banTtl(ip: string): Promise<number> {
    try {
      const ttl = await this.redis.ttl(this.banKey(ip));
      return ttl > 0 ? ttl : 0;
    } catch (err) {
      // Si Redis falla, no bloqueamos (fail-open): mejor servir que caernos.
      this.logger.error(`banTtl falló para ${ip}: ${(err as Error).message}`);
      return 0;
    }
  }

  /** Registra una violación de rate limit; banea si cruza el umbral. */
  async registerViolation(ip: string): Promise<void> {
    try {
      const k = this.violKey(ip);
      const count = await this.redis.incr(k);
      if (count === 1) {
        await this.redis.expire(k, this.WINDOW_SEC);
      }
      if (count >= this.THRESHOLD) {
        await this.ban(ip);
        await this.redis.del(k);
      }
    } catch (err) {
      this.logger.error(`registerViolation falló para ${ip}: ${(err as Error).message}`);
    }
  }

  private async ban(ip: string): Promise<void> {
    const level = await this.redis.incr(this.levelKey(ip));
    await this.redis.expire(this.levelKey(ip), this.LEVEL_TTL_SEC);
    const idx = Math.min(level - 1, this.BAN_LADDER_SEC.length - 1);
    const ttl = this.BAN_LADDER_SEC[idx];
    await this.redis.set(this.banKey(ip), '1', 'EX', ttl);
    this.logger.warn(`IP ${ip} bloqueada ${ttl}s (reincidencia nivel ${level})`);
  }

  /** Levanta el ban manualmente (uso admin/operativo). */
  async unban(ip: string): Promise<void> {
    await this.redis.del(this.banKey(ip), this.violKey(ip), this.levelKey(ip));
  }
}
