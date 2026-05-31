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
import { clientIp, isInternalIp } from './ip.util';

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

  // No throttlear (ni contar violaciones) cuando:
  //  - la IP es interna/infra (proxy/SSR de Next que concentra todo el tráfico),
  //  - el endpoint es de infra polleado por el front (/maintenance, /health).
  // Sin esto, una sola IP interna se autobanea y tumba el sitio entero.
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (isInternalIp(clientIp(req))) return true;
    const url: string = req?.url ?? '';
    if (url.includes('/maintenance') || url.includes('/health')) return true;
    return super.shouldSkip(context);
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
