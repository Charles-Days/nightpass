const mxn = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const intMx = new Intl.NumberFormat('es-MX');

/** Formatea centavos (MXN) como `$X,XXX.XX MXN`. */
export function money(cents: number): string {
  return `$${mxn.format((cents ?? 0) / 100)} MXN`;
}

/** Formatea un entero con separadores de miles es-MX. */
export function intCount(n: number): string {
  return intMx.format(n ?? 0);
}

/** Formatea un ratio 0..1 como porcentaje entero (`73%`). */
export function pct(ratio: number, decimals = 0): string {
  return `${((ratio ?? 0) * 100).toFixed(decimals)}%`;
}
