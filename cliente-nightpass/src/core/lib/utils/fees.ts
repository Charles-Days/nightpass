// Stripe Mexico: 3.6% + $3 MXN por transacción exitosa con tarjeta.
// Ref: https://stripe.com/mx/pricing
export const STRIPE_FEE_PCT = 3.6;
export const STRIPE_FIXED_CENTS = 300; // 3 MXN

export interface TierFeeBreakdown {
  /** Precio bruto que paga el cliente (centavos). */
  grossCents: number;
  /** Comisión Stripe en centavos. */
  stripeCents: number;
  /** Comisión NightPass en centavos. */
  platformCents: number;
  /** Neto que recibe el dueño en centavos. */
  netCents: number;
  /** % efectivo total retenido sobre el gross. */
  totalFeePct: number;
}

export function computeTierBreakdown(
  grossCents: number,
  platformFeePct: number,
): TierFeeBreakdown {
  if (!Number.isFinite(grossCents) || grossCents <= 0) {
    return {
      grossCents: 0,
      stripeCents: 0,
      platformCents: 0,
      netCents: 0,
      totalFeePct: 0,
    };
  }
  const stripeCents = Math.round((grossCents * STRIPE_FEE_PCT) / 100) + STRIPE_FIXED_CENTS;
  const platformCents = Math.round((grossCents * Math.max(0, platformFeePct)) / 100);
  const netCents = Math.max(0, grossCents - stripeCents - platformCents);
  const totalFeePct = ((stripeCents + platformCents) / grossCents) * 100;
  return { grossCents, stripeCents, platformCents, netCents, totalFeePct };
}

/**
 * Inversa: dado netoDeseado y platformFeePct, calcula precio bruto sugerido.
 * Útil para "quiero quedarme con X, cuánto cobro".
 */
export function computeGrossForNet(
  netCentsTarget: number,
  platformFeePct: number,
): number {
  if (!Number.isFinite(netCentsTarget) || netCentsTarget <= 0) return 0;
  // gross - stripe(gross) - platform(gross) = net
  // gross * (1 - stripePct/100 - platformPct/100) - fixedStripe = net
  const k = 1 - STRIPE_FEE_PCT / 100 - Math.max(0, platformFeePct) / 100;
  if (k <= 0) return 0;
  return Math.ceil((netCentsTarget + STRIPE_FIXED_CENTS) / k);
}

/**
 * Modo de comisión en efectivo por-tier.
 *  - ADD:      la comisión NightPass se SUMA al precio (cliente paga más).
 *  - SUBTRACT: la comisión se DESCUENTA (cliente paga menos; comportamiento actual).
 */
export type CashFeeMode = 'ADD' | 'SUBTRACT';

/** Solo la comisión Stripe (sin fijo NightPass) para un bruto dado. */
export function stripeFeeForGross(grossCents: number): number {
  if (!Number.isFinite(grossCents) || grossCents <= 0) return 0;
  return Math.round((grossCents * STRIPE_FEE_PCT) / 100) + STRIPE_FIXED_CENTS;
}

/**
 * Precio efectivo unitario que paga el cliente en la puerta.
 *
 * Semántica (sobre el bruto unitario "gross" = precio online vigente del tier):
 *   base   = gross − stripeFeeForGross(gross)   // efectivo no paga Stripe
 *   npComm = exempt ? 0 : round(gross * feePct / 100)
 *   SUBTRACT => cashPrice = base                 // org absorbe comisión vía wallet
 *   ADD      => cashPrice = base + npComm         // org la recupera del cliente
 *
 * El toggle ADD/SUBTRACT solo cambia el PRECIO que entrega el cliente, no cómo
 * NightPass cobra la comisión (eso sigue siendo el wallet prepagado en backend).
 */
export function computeCashUnitPrice(
  grossUnitCents: number,
  feePct: number,
  exempt: boolean,
  mode: CashFeeMode = 'SUBTRACT',
): number {
  if (!Number.isFinite(grossUnitCents) || grossUnitCents <= 0) return 0;
  const base = Math.max(0, grossUnitCents - stripeFeeForGross(grossUnitCents));
  const npComm = exempt ? 0 : Math.round((grossUnitCents * Math.max(0, feePct)) / 100);
  return mode === 'ADD' ? base + npComm : base;
}

export function formatCents(cents: number, currency = 'MXN'): string {
  const sym = currency.toLowerCase() === 'mxn' ? '$' : currency.toLowerCase() === 'eur' ? '€' : '$';
  return `${sym}${(cents / 100).toFixed(2)} ${currency}`;
}
