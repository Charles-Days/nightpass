import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Devuelve el secreto HMAC para firmar QR de pases, o lanza 503 si no está
 * configurado. NUNCA cae a un fallback hardcodeado: firmar con un secreto
 * público permitiría a cualquiera falsificar QR de pases. Toda ruta que FIRME
 * un pase (claim, transfer, dev-bypass, confirm de efectivo) debe usar esto,
 * igual que `scan()` ya exige el secreto para VERIFICAR.
 */
export function requirePassSecret(config: ConfigService): string {
  const secret = config.get<string>('PASS_HMAC_SECRET');
  if (!secret) {
    throw new ServiceUnavailableException('PASS_HMAC_SECRET no configurado');
  }
  return secret;
}
