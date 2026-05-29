import { BarChart3 } from 'lucide-react';
import type { AdminFinanceDailyPoint } from '@/core/types/api';
import { money, intCount } from '../lib/format';

function dayLabel(day: string): string {
  // day is 'YYYY-MM-DD' — parse as local date, avoid TZ shift.
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

export function DailyChart({ series }: { series: AdminFinanceDailyPoint[] }) {
  const maxGross = Math.max(1, ...series.map((p) => p.grossCents));
  const totalSales = series.reduce((acc, p) => acc + p.sales, 0);
  const totalGross = series.reduce((acc, p) => acc + p.grossCents, 0);

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Tendencia</p>
          <h2 className="mt-1 font-display text-lg font-bold tracking-tight">Ventas por día</h2>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pases</p>
            <p className="font-display text-sm font-bold text-white">{intCount(totalSales)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Bruto</p>
            <p className="font-display text-sm font-bold text-white">{money(totalGross)}</p>
          </div>
          <BarChart3 className="size-5 text-purple-400" />
        </div>
      </div>

      {series.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No hay actividad en este periodo.
        </p>
      ) : (
        <div className="mt-7 flex h-44 items-end gap-1.5 overflow-x-auto pb-1">
          {series.map((p) => {
            const heightPct = Math.max(2, Math.round((p.grossCents / maxGross) * 100));
            return (
              <div
                key={p.day}
                className="group flex min-w-[10px] flex-1 flex-col items-center justify-end gap-2"
                title={`${dayLabel(p.day)} · ${intCount(p.sales)} pases · ${money(p.grossCents)}`}
              >
                <div className="flex h-full w-full items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-[#7c3aed] to-[#c084fc] opacity-80 transition group-hover:opacity-100"
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="hidden text-[9px] leading-none text-muted-foreground sm:block">
                  {dayLabel(p.day).replace('.', '')}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
