import * as argon2 from 'argon2';
import type { Role } from '@prisma/client';

const ARGON2_OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

const MIN_PASSWORD_LENGTH = 8;

export async function hashPassword(plain: string): Promise<string> {
  if (plain.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }
  return argon2.hash(plain, ARGON2_OPTS);
}

export interface SeedSummary {
  label: string;
  email: string;
  password: string;
  role: Role;
  status: 'created' | 'updated' | 'skipped';
}

export function logSummary(summary: SeedSummary): void {
  const statusBadge =
    summary.status === 'created'
      ? '🆕 creado'
      : summary.status === 'updated'
        ? '♻️ actualizado'
        : '⏭️ ya existía';

  // eslint-disable-next-line no-console
  console.log(
    `${statusBadge}  ${summary.label}\n` +
      `   email:    ${summary.email}\n` +
      `   password: ${summary.password}\n` +
      `   role:     ${summary.role}\n`,
  );
}
