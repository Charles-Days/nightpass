// Precio de un boleto pagado en EFECTIVO.
//
// El `priceCents` del tier es el BRUTO online: ya trae adentro la comisión de
// Stripe (3.6% + $3) y la comisión de NightPass (platformFeePct), porque el
// organizador lo fija para recibir su neto en ventas con tarjeta.
//
// En efectivo NO hay Stripe, así que ese costo no debe cobrarse al cliente. La
// comisión de NightPass se cobra aparte del CashWallet del organizador (riel de
// cobro que NO cambia con esta feature). El toggle ADD/SUBTRACT solo decide qué
// PRECIO entrega el cliente en efectivo, no cómo NightPass cobra su comisión.
//
//   base   = bruto − stripe          // efectivo no paga Stripe
//   npComm = exento ? 0 : round(bruto * feePct / 100)
//
//   SUBTRACT (default, comportamiento histórico): cashPrice = base
//     → el cliente paga base; la org absorbe la comisión NP vía wallet.
//   ADD: cashPrice = base + npComm
//     → el cliente paga base + comisión; la org la recupera del cliente.
//
//   (si exento => npComm = 0 => ambos modos dan base)
//
// Debe mantenerse idéntico al cálculo del cliente (cliente-nightpass fees.ts).
export const CASH_STRIPE_FEE_PCT = 3.6;
export const CASH_STRIPE_FIXED_CENTS = 300; // $3 MXN

/** Modo de aplicación de la comisión NP sobre el precio en efectivo. */
export type CashFeeMode = 'ADD' | 'SUBTRACT';

/** Comisión de Stripe que trae embebida un bruto unitario. */
export function stripeFeeForGross(grossUnitCents: number): number {
  return (
    Math.round((grossUnitCents * CASH_STRIPE_FEE_PCT) / 100) +
    CASH_STRIPE_FIXED_CENTS
  );
}

/** Comisión NP embebida en un bruto unitario. */
export function npFeeForGross(grossUnitCents: number, feePct: number): number {
  return Math.round((grossUnitCents * feePct) / 100);
}

/**
 * Precio en efectivo de UN boleto. Nunca baja de 0.
 * @param grossUnitCents precio bruto unitario (lo que se paga online)
 * @param feePct comisión NP del organizador (o global)
 * @param exempt si el organizador está exento de comisión en efectivo
 * @param mode  'SUBTRACT' (default) = cliente paga base; 'ADD' = cliente paga base + comisión NP
 * @param cashBaseOverrideCents precio en efectivo propio del tier. Si se da (>0),
 *   ese ES la base (y la base de comisión) en vez de derivar `bruto − Stripe`.
 *   Permite que el organizador fije el monto exacto a recibir en efectivo.
 */
export function computeCashUnitPrice(
  grossUnitCents: number,
  feePct: number,
  exempt: boolean,
  mode: CashFeeMode = 'SUBTRACT',
  cashBaseOverrideCents?: number | null,
): number {
  const hasOverride =
    cashBaseOverrideCents != null && cashBaseOverrideCents > 0;
  const base = hasOverride
    ? cashBaseOverrideCents
    : grossUnitCents - stripeFeeForGross(grossUnitCents);
  // La comisión se calcula sobre la base efectiva: el precio propio si existe,
  // o el bruto online si se deriva (mantiene "mismo % que online" en ese caso).
  const commBase = hasOverride ? cashBaseOverrideCents : grossUnitCents;
  const npComm = exempt ? 0 : npFeeForGross(commBase, feePct);
  const price = mode === 'ADD' ? base + npComm : base;
  return Math.max(0, price);
}
