import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { IpBlocklistService } from './ip-blocklist.service';
import { IpBlocklistGuard } from './ip-blocklist.guard';
import { BanningThrottlerGuard } from './banning-throttler.guard';

/**
 * Capa de seguridad de red. El orden de APP_GUARD importa: primero la blocklist
 * (corta IPs baneadas con 403 sin trabajar), luego el throttler (cuenta y, al
 * exceder, alimenta la blocklist).
 */
@Module({
  providers: [
    IpBlocklistService,
    { provide: APP_GUARD, useClass: IpBlocklistGuard },
    { provide: APP_GUARD, useClass: BanningThrottlerGuard },
  ],
  exports: [IpBlocklistService],
})
export class SecurityModule {}
