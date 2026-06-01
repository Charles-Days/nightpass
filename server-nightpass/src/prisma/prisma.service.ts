import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('Prisma');

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (err) {
      // Si la DB está caída/lenta al boot, fallar rápido con rastro en vez de
      // colgar el arranque indefinidamente.
      this.logger.error(
        `No se pudo conectar a Postgres al boot: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
