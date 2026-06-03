// Precio de un boleto pagado en EFECTIVO.
//
// El `priceCents` del tier es el BRUTO online: ya trae adentro la comisión de
// Stripe (3.6% + $3) y la comisión de NightPass (platformFeePct), porque el
// organizador lo fija para recibir su neto en ventas con tarjeta.
//
// En efectivo NO hay Stripe, así que ese costo no debe cobrarse al cliente. La
// comisión de NightPass se cobra aparte del CashWallet del organizador (o no se
// cobra si está exento). Por eso:
//
//   precio_efectivo = bruto − stripe − (exento ? comisiónNP : 0)
//
// - No exento: el cliente paga bruto−stripe (incluye la parte de NP); el
//   organizador la reenvía a NP vía wallet y termina con su neto.
// - Exento: el cliente paga el neto puro (bruto−stripe−NP); NP no cobra nada.
//
// Debe mantenerse idéntico al cálculo del cliente (cliente-nightpass fees.ts).
export const CASH_STRIPE_FEE_PCT = 3.6;
export const CASH_STRIPE_FIXED_CENTS = 300; // $3 MXN

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
 */
export function computeCashUnitPrice(
  grossUnitCents: number,
  feePct: number,
  exempt: boolean,
): number {
  const stripe = stripeFeeForGross(grossUnitCents);
  const np = exempt ? npFeeForGross(grossUnitCents, feePct) : 0;
  return Math.max(0, grossUnitCents - stripe - np);
}
