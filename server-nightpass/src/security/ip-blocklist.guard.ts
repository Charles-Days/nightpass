import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { IpBlocklistService } from './ip-blocklist.service';
import { clientIp, isInternalIp } from './ip.util';

/**
 * Corre ANTES del throttler. Si la IP está baneada, corta con 403 + Retry-After
 * sin procesar el request (no malgasta CPU en atacantes reincidentes).
 */
@Injectable()
export class IpBlocklistGuard implements CanActivate {
  constructor(private readonly blocklist: IpBlocklistService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const ip = clientIp(req);
    // IPs internas (proxy / SSR de Next) nunca se bloquean — son infra, no
    // atacantes, y concentran todo el tráfico server-side.
    if (isInternalIp(ip)) return true;
    const ttl = await this.blocklist.banTtl(ip);
    if (ttl > 0) {
      const res = context.switchToHttp().getResponse();
      res.header?.('Retry-After', String(ttl));
      throw new HttpException(
        'Tu IP está temporalmente bloqueada por actividad sospechosa.',
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}
