import { randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const ALPHABET_LEN = ALPHABET.length;
const REJECT_THRESHOLD = 256 - (256 % ALPHABET_LEN);

export function generateTemporaryPassword(length = 12): string {
  if (length < 4) {
    throw new Error('temporary password length must be >= 4');
  }
  const out: string[] = [];
  while (out.length < length) {
    const buf = randomBytes(length * 2);
    for (let i = 0; i < buf.length && out.length < length; i++) {
      const byte = buf[i];
      if (byte < REJECT_THRESHOLD) {
        out.push(ALPHABET[byte % ALPHABET_LEN]);
      }
    }
  }
  return out.join('');
}
