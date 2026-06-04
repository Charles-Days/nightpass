'use client';

import { CalendarDays, ChevronRight } from 'lucide-react';
import type { PassesStatsEventRow } from '@/core/types/api';

const mxnFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function EventsTable({
  rows,
  onRowClick,
}: {
  rows: PassesStatsEventRow[];
  onRowClick: (eventId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-[22px] border border-white/14 bg-white/[0.05] py-10 text-center sm:py-16">
        <CalendarDays className="size-8 text-muted-foreground/60" />
        <p className="font-medium">Sin eventos con ventas en este rango</p>
        <p className="text-sm text-muted-foreground">
          Ajusta el periodo o publica un nuevo evento.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[22px] border border-white/14 bg-white/[0.05]">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-white/12 bg-white/[0.035] text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Evento</th>
            <th className="px-4 py-3 font-medium">Capacidad</th>
            <th className="px-4 py-3 font-medium">Vendidos</th>
            <th className="px-4 py-3 font-medium">Canjeados</th>
            <th className="px-4 py-3 font-medium">Ingresos</th>
            <th className="px-4 py-3 text-right font-medium">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.eventId}
              className="cursor-pointer border-b border-white/10 transition-colors last:border-b-0 hover:bg-white/[0.08]"
              onClick={() => onRowClick(row.eventId)}
            >
              <td className="px-4 py-3">
                <p className="font-medium">{row.title}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(row.startsAt)}</p>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {row.capacity != null ? row.capacity : '—'}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {row.vendidos + (row.vendidosAdmin ?? 0)}
                {row.vendidosAdmin ? (
                  <span className="ml-1 text-xs text-emerald-300/80">
                    ({row.vendidos} app · {row.vendidosAdmin} efvo)
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {row.canjeados} / {row.vendidos + (row.vendidosAdmin ?? 0)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {mxnFormatter.format((row.ingresos + (row.ingresosAdmin ?? 0)) / 100)}
                {row.ingresosAdmin ? (
                  <span className="ml-1 text-xs text-emerald-300/80">
                    (efvo {mxnFormatter.format(row.ingresosAdmin / 100)})
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-right">
                <ChevronRight className="ml-auto size-4 text-muted-foreground/60" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
