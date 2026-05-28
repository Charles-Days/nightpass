/**
 * Formatters compartidos para el panel.
 *
 * `formatMoney` recibe **centavos** (el backend persiste todo en cents) y
 * devuelve un string tipo `"$1,200 MXN"`. Sin decimales por default para
 * importes grandes; usar `withDecimals` cuando se necesite precisión.
 *
 * `formatDate` recibe un ISO string y devuelve "27 may" o "27 may 22:00"
 * cuando `time` está activo.
 */

const MX_CURRENCY = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

export interface FormatMoneyOptions {
  currency?: string;
  withDecimals?: boolean;
}

export function formatMoney(cents: number, opts: FormatMoneyOptions = {}): string {
  const { currency, withDecimals } = opts;
  const amount = (cents ?? 0) / 100;
  if (!currency || currency.toUpperCase() === 'MXN') {
    if (withDecimals) {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 2,
      }).format(amount);
    }
    return MX_CURRENCY.format(amount);
  }
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(amount);
}

export interface FormatDateOptions {
  /** Incluye hora estilo "22:00". */
  time?: boolean;
  /** Devuelve mes corto (`may`) en lugar del default ("27 may"). */
  short?: boolean;
}

export function formatDate(iso: string | null | undefined, opts: FormatDateOptions = {}): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: opts.short ? 'short' : 'short',
  });
  if (!opts.time) return date;
  const time = d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${date} ${time}`;
}

/** Día corto estilo "27 may" — útil para ejes de gráficos. */
export function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}
