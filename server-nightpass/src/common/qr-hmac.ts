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

/**
 * Firma un QR de check-in estatico para un venue.
 *
 * El payload final es `np_checkin_<venueId>_<hmacHex>`. Solo el venueId entra
 * en el HMAC para que el codigo impreso siga funcionando hasta la siguiente
 * rotacion del `checkinQrSecret` del venue.
 */
export function signVenueCheckin(venueId: string, secret: string): string {
  const payload = `checkin:${venueId}`;
  const hex = createHmac('sha256', secret).update(payload).digest('hex');
  return `np_checkin_${venueId}_${hex}`;
}

const VENUE_CHECKIN_REGEX = /^np_checkin_([0-9a-f-]{36})_([0-9a-f]{64})$/i;

/**
 * Verifica un payload de check-in. Devuelve `{ venueId }` cuando el formato y
 * el HMAC coinciden con el secreto actual del venue; `null` en cualquier otro
 * caso (formato invalido o HMAC distinto).
 */
export function verifyVenueCheckin(
  payload: string,
  secret: string,
): { venueId: string } | null {
  const match = payload.trim().match(VENUE_CHECKIN_REGEX);
  if (!match) return null;
  const venueId = match[1];
  const provided = match[2].toLowerCase();
  const expected = createHmac('sha256', secret)
    .update(`checkin:${venueId}`)
    .digest('hex');
  if (!verifyHmac(provided, expected)) return null;
  return { venueId };
}
