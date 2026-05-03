import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Firma un pass con HMAC-SHA256.
 *
 * El QR final se compone como `np_<passId>_<hmacHex>`. El payload firmado
 * mezcla el `passId`, el `eventId` y el `userId` para que un atacante no
 * pueda mover un hash entre passes diferentes.
 */
export function signPass(
  passId: string,
  eventId: string,
  userId: string,
  secret: string,
): string {
  const payload = `${passId}|${eventId}|${userId}`;
  const hex = createHmac('sha256', secret).update(payload).digest('hex');
  return `np_${passId}_${hex}`;
}

const QR_REGEX = /^np_([0-9a-f-]{36})_([0-9a-f]{64})$/i;

export interface ParsedQr {
  passId: string;
  hmac: string;
}

export function parseQr(qr: string): ParsedQr | null {
  const match = qr.trim().match(QR_REGEX);
  if (!match) return null;
  return { passId: match[1], hmac: match[2].toLowerCase() };
}

export function recomputeHmac(
  passId: string,
  eventId: string,
  userId: string,
  secret: string,
): string {
  const payload = `${passId}|${eventId}|${userId}`;
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Compara dos hex strings en tiempo constante para evitar timing attacks.
 */
export function verifyHmac(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(provided, 'hex'),
      Buffer.from(expected, 'hex'),
    );
  } catch {
    return false;
  }
}
