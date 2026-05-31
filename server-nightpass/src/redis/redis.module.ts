import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * Cliente Redis compartido (ioredis). Lo usan el throttler distribuido y la
 * blocklist de IPs. @Global → se inyecta `@Inject(REDIS_CLIENT)` en cualquier
 * módulo sin reimportar.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('Redis');
        const client = new Redis(config.getOrThrow<string>('REDIS_URL'), {
          // No tumbar el proceso si Redis parpadea; reintenta con backoff.
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 200, 2_000),
        });
        client.on('error', (err) => logger.error(`Redis error: ${err.message}`));
        client.on('connect', () => logger.log('Redis conectado'));
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor() {}
  async onApplicationShutdown() {
    // ioredis se cierra solo al recibir SIGTERM; nada que hacer aquí por ahora.
  }
}
