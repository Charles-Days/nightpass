import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  getOptionsToken,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import type { ThrottlerLimitDetail } from '@nestjs/throttler/dist/throttler.guard.interface';
import { IpBlocklistService } from './ip-blocklist.service';
import { clientIp } from './ip.util';

/**
 * ThrottlerGuard que, además de responder 429, anota cada exceso en la
 * blocklist. Acumuladas suficientes violaciones, la IP queda baneada (403) por
 * el IpBlocklistGuard. Usa `clientIp` como tracker para que el conteo de
 * throttle y el de bans compartan exactamente la misma clave de IP.
 */
@Injectable()
export class BanningThrottlerGuard extends ThrottlerGuard {
  constructor(
    @Inject(getOptionsToken()) options: ThrottlerModuleOptions,
    @Inject(ThrottlerStorage) storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly blocklist: IpBlocklistService,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    return clientIp(req);
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest();
    await this.blocklist.registerViolation(clientIp(req));
    return super.throwThrottlingException(context, detail);
  }
}
