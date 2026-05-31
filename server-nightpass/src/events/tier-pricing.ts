/**
 * Resolución de precios escalonados por fecha de un EventTier.
 *
 * Un tier tiene un precio base (`EventTier.priceCents`, el early-bird) y, opcional,
 * varias fases (`EventTierPrice`) que SUBEN el precio al acercarse el evento. Cada
 * fase se activa `daysBeforeEvent` días naturales antes de `event.startsAt`.
 *
 * Precio activo "ahora" = la fase con la activación más reciente que ya pasó; si
 * ninguna pasó todavía, aplica el precio base. El precio se BLOQUEA al crear la
 * orden (ver OrdersService) — cambiar fases después no afecta órdenes existentes.
 */

const DAY_MS = 86_400_000;

export interface TierPricePhase {
  priceCents: number;
  daysBeforeEvent: number;
}

export interface ResolvedTierPrice {
  /** Precio vigente ahora (lo que paga el comprador en este momento). */
  currentCents: number;
  /** Precio base / early-bird del tier. */
  baseCents: number;
  /** Próxima subida programada aún en el futuro, o null si no hay más. */
  next: { priceCents: number; startsAt: Date } | null;
  /** Todas las subidas futuras, cronológico (la más cercana primero). */
  upcoming: { priceCents: number; startsAt: Date }[];
}

export function resolveTierPrice(
  baseCents: number,
  phases: TierPricePhase[],
  eventStartsAt: Date,
  now: Date = new Date(),
): ResolvedTierPrice {
  const startMs = eventStartsAt.getTime();
  const nowMs = now.getTime();

  const withActivation = phases
    .map((p) => ({
      priceCents: p.priceCents,
      activationMs: startMs - p.daysBeforeEvent * DAY_MS,
    }))
    .sort((a, b) => a.activationMs - b.activationMs); // cronológico

  let currentCents = baseCents;
  for (const p of withActivation) {
    if (nowMs >= p.activationMs) currentCents = p.priceCents;
  }

  const upcoming = withActivation
    .filter((p) => p.activationMs > nowMs)
    .map((p) => ({ priceCents: p.priceCents, startsAt: new Date(p.activationMs) }));

  return {
    currentCents,
    baseCents,
    next: upcoming[0] ?? null,
    upcoming,
  };
}
