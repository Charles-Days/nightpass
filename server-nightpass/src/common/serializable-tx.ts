import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Corre una transacción con aislamiento Serializable y reintenta ante fallos de
 * serialización de Postgres (SQLSTATE 40001, Prisma P2034). Serializable hace
 * que dos transacciones concurrentes que leen un conteo de aforo y luego
 * insertan se detecten como conflicto: una hace commit, la otra aborta y se
 * reintenta sobre el estado ya actualizado — así no hay sobreventa ni doble
 * emisión por carreras.
 *
 * El callback debe ser idempotente respecto a sus propias lecturas (no efectos
 * externos no transaccionales), porque puede ejecutarse más de una vez.
 */
export async function runSerializable<T>(
  prisma: PrismaService,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (err) {
      const code =
        err instanceof Prisma.PrismaClientKnownRequestError ? err.code : null;
      // P2034: write conflict / deadlock por serialización → reintentar.
      if (code === 'P2034' && attempt < maxRetries) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
