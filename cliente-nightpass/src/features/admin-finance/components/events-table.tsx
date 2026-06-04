'use client';

import { useState } from 'react';
import { CalendarOff, ChevronRight } from 'lucide-react';
import type { AdminFinanceEventRow } from '@/core/types/api';
import { money, intCount } from '../lib/format';
import { EventDetailDialog } from './event-detail-dialog';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function FillBar({ vendidos, vendidosAdmin, capacity }: { vendidos: number; vendidosAdmin?: number; capacity: number | null }) {
  if (!capacity || capacity <= 0) {
    return <span className="text-[11px] text-muted-foreground">Sin cupo</span>;
  }
  const total = vendidos + (vendidosAdmin ?? 0);
  const ratio = Math.min(1, total / capacity);
  const percent = Math.round(ratio * 100);
  const full = ratio >= 0.9;
  return (
    <div className="min-w-[88px] space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-semibold ${full ? 'text-emerald-400' : 'text-white/80'}`}>
          {percent}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full ${
            full ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-purple-500 to-[#a855f7]'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function EventsTable({ rows }: { rows: AdminFinanceEventRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="space-y-3">
      <EventDetailDialog eventId={openId} onClose={() => setOpenId(null)} />
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold tracking-tight">Ventas por evento</h2>
        <span className="text-xs text-muted-foreground">{intCount(rows.length)} eventos</span>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[22px] border border-dashed border-white/14 bg-white/[0.02] p-12 text-center">
          <CalendarOff className="size-7 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">No hay ventas registradas en este periodo.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-white/14 bg-white/[0.05]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-white/12 bg-white/[0.035] text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Evento</th>
                  <th className="px-5 py-3.5 font-semibold">Organizador</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Vendidos</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Capacidad</th>
                  <th className="px-5 py-3.5 font-semibold">% lleno</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Bruto</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Comisión NP</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Órdenes</th>
                  <th className="px-5 py-3.5" aria-label="Detalle" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.eventId}
                    onClick={() => setOpenId(row.eventId)}
                    className="group cursor-pointer border-b border-white/10 last:border-0 hover:bg-white/[0.08]"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-white">{row.title}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDate(row.startsAt)}</p>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{row.venueName ?? '—'}</td>
                    <td className="px-5 py-3.5 text-right font-medium text-white">
                      <div>{intCount(row.vendidos + (row.vendidosAdmin ?? 0))}</div>
                      {row.vendidosAdmin ? (
                        <div className="text-[11px] font-medium text-emerald-400">
                          {row.vendidos} app · {row.vendidosAdmin} efvo
                        </div>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground">
                      {row.capacity != null ? intCount(row.capacity) : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <FillBar vendidos={row.vendidos} vendidosAdmin={row.vendidosAdmin} capacity={row.capacity} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-white">
                      <div>{money(row.grossCents + (row.ingresosAdmin ?? 0))}</div>
                      {row.ingresosAdmin ? (
                        <div className="text-[11px] font-medium text-emerald-400">
                          efvo {money(row.ingresosAdmin)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-[#10b981]">{money(row.platformFeeCents)}</td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground">{intCount(row.ordersCount)}</td>
                    <td className="px-3 py-3.5 text-right">
                      <ChevronRight className="ml-auto size-4 text-muted-foreground/40 transition group-hover:text-primary" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
