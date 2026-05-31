import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const SETTING_KEY = 'maintenance';
// Cache corto en memoria: el flag se lee en CADA request del front (vía el
// middleware), así que evitamos pegarle a Postgres cada vez.
const CACHE_TTL_MS = 5_000;

export interface MaintenanceStatus {
  maintenance: boolean;
  message: string | null;
}

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);
  private cache: { value: MaintenanceStatus; at: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getStatus(): Promise<MaintenanceStatus> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) {
      return this.cache.value;
    }

    let status: MaintenanceStatus = { maintenance: false, message: null };
    try {
      const row = await this.prisma.appSetting.findUnique({
        where: { key: SETTING_KEY },
      });
      if (row && row.value && typeof row.value === 'object') {
        const v = row.value as { enabled?: boolean; message?: string | null };
        status = {
          maintenance: Boolean(v.enabled),
          message: v.message ?? null,
        };
      }
    } catch (err) {
      // Si la DB falla, no bloqueamos: el front ya trata el backend caído como
      // mantenimiento automático por su cuenta.
      this.logger.warn(
        `No se pudo leer el flag de mantenimiento: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    this.cache = { value: status, at: Date.now() };
    return status;
  }

  async setStatus(
    enabled: boolean,
    message?: string | null,
  ): Promise<MaintenanceStatus> {
    const value = { enabled, message: message ?? null };
    await this.prisma.appSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: value as Prisma.InputJsonValue },
      update: { value: value as Prisma.InputJsonValue },
    });
    this.cache = null; // invalidar para que el próximo read sea fresco
    this.logger.log(`Modo mantenimiento ${enabled ? 'ACTIVADO' : 'desactivado'}`);
    return { maintenance: enabled, message: value.message };
  }
}
