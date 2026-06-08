'use client';

import { Loader2, TrendingUp } from 'lucide-react';
import {
  useEventRpBreakdown,
  type EventRpBreakdownRow,
} from '../hooks/use-rp';

const money = (cents: number, currency = 'MXN') =>
  `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;

/** Describe la regla de comisión de forma corta y legible. */
function commissionLabel(c: EventRpBreakdownRow['commission']): string {
  if (!c) return 'Sin comisión';
  if (c.type === 'PERCENTAGE' && c.percentage != null) {
    return `${c.percentage}% por venta`;
  }
  if (c.type === 'PER_N_TICKETS' && c.nTickets && c.rewardCents != null) {
    return `${money(c.rewardCents, c.currency)} por cada ${c.nTickets} boletos`;
  }
  return 'Sin comisión';
}

/**
 * Gestión (admin / organizador): por evento, cada RP con su comisión, sus ventas
 * atribuidas y sus ganancias. `promoter` usa la ruta scoped del organizador.
 */
export function EventRpBreakdown({
  eventId,
  promoter = false,
}: {
  eventId: string;
  promoter?: boolean;
}) {
  const { data, isLoading, isError } = useEventRpBreakdown(eventId, { promoter });

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
        <Loader2 className="size-4 animate-spin" /> Cargando…
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-muted-foreground py-4 text-sm">
        No se pudo cargar el desglose de RPs.
      </p>
    );
  }

  const rps = data?.rps ?? [];

  if (rps.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed border-white/14 bg-white/[0.02] p-6 text-center text-sm">
        Aún no hay RPs vendiendo este evento. Asígnalos o crea reglas de comisión.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Totales */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/12 bg-white/[0.03] p-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
            Ventas por RPs
          </p>
          <p className="font-display mt-0.5 text-xl font-bold text-white">
            {data?.totals.sales ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-white/12 bg-white/[0.03] p-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
            Comisiones a pagar
          </p>
          <p className="font-display mt-0.5 text-xl font-bold text-emerald-400">
            {money(data?.totals.earningsCents ?? 0)}
          </p>
        </div>
      </div>

      {/* Lista por RP */}
      <div className="space-y-2">
        {rps.map((rp) => (
          <div
            key={rp.rpProfileId}
            className="rounded-xl border border-white/12 bg-white/[0.025] p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  {rp.displayName}
                  <span className="font-mono text-[11px] text-primary/70">
                    {rp.rpCode}
                  </span>
                  {!rp.isActive && (
                    <span className="rounded-full border border-white/14 px-1.5 text-[10px] text-white/50">
                      inactivo
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {rp.email}
                </p>
              </div>
              <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold">
                <TrendingUp className="size-3" />
                {rp.sales} {rp.sales === 1 ? 'venta' : 'ventas'}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-black/20 px-2.5 py-1.5">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">
                  Comisión {rp.commission?.scope === 'global' ? '(global)' : ''}
                </p>
                <p className="mt-0.5 text-white/85">
                  {commissionLabel(rp.commission)}
                </p>
              </div>
              <div className="rounded-lg bg-black/20 px-2.5 py-1.5">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">
                  Ganancia
                </p>
                <p className="mt-0.5 font-semibold text-emerald-400">
                  {money(rp.earningsCents)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
