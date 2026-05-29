import { ArrowDownRight, Wallet, TrendingUp } from 'lucide-react';
import type { AdminFinanceTotals } from '@/core/types/api';
import { money } from '../lib/format';

interface Line {
  label: string;
  sub?: string;
  cents: number;
  kind: 'gross' | 'deduction' | 'net';
}

export function MoneyBreakdown({ totals }: { totals: AdminFinanceTotals }) {
  const lines: Line[] = [
    { label: 'Bruto cobrado', sub: 'Total facturado a clientes', cents: totals.grossCents, kind: 'gross' },
    { label: 'Fee Stripe (estimado)', sub: 'Procesamiento de pago', cents: totals.stripeFeeEstCents, kind: 'deduction' },
    { label: 'Pagado a locales / organizadores', sub: 'Payout vía Stripe Connect', cents: totals.netToVenuesCents, kind: 'deduction' },
    { label: 'Comisiones RP', sub: 'Pago a promotores referidores', cents: totals.rpCommissionsCents, kind: 'deduction' },
  ];

  const grossMax = Math.max(totals.grossCents, 1);

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.025] p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Flujo de dinero</p>
          <h2 className="mt-1 font-display text-lg font-bold tracking-tight">Cómo se reparte el bruto</h2>
        </div>
        <Wallet className="size-5 text-purple-400" />
      </div>

      <div className="mt-6 space-y-2.5">
        {lines.map((line) => {
          const width = Math.max(2, Math.round((line.cents / grossMax) * 100));
          const isDeduction = line.kind === 'deduction';
          return (
            <div
              key={line.label}
              className="rounded-2xl border border-white/5 bg-white/[0.01] p-3.5"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  {isDeduction ? (
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-muted-foreground">
                      <ArrowDownRight className="size-3.5" />
                    </span>
                  ) : (
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-300">
                      <TrendingUp className="size-3.5" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{line.label}</p>
                    {line.sub ? <p className="text-[11px] text-muted-foreground">{line.sub}</p> : null}
                  </div>
                </div>
                <span
                  className={`shrink-0 font-mono text-sm font-semibold ${
                    isDeduction ? 'text-muted-foreground' : 'text-white'
                  }`}
                >
                  {isDeduction ? '− ' : ''}
                  {money(line.cents)}
                </span>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full ${
                    line.kind === 'gross'
                      ? 'bg-gradient-to-r from-purple-500 to-[#a855f7]'
                      : 'bg-white/15'
                  }`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Net result */}
      <div className="mt-5 flex items-center justify-between rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <PiggyEquals />
          </span>
          <div>
            <p className="text-sm font-bold text-white">Neto NightPass</p>
            <p className="text-[11px] text-muted-foreground">Comisión de plataforma retenida</p>
          </div>
        </div>
        <span className="font-display text-xl font-extrabold text-[#10b981]">
          {money(totals.platformFeeCents)}
        </span>
      </div>
    </div>
  );
}

function PiggyEquals() {
  return <span className="text-base font-black leading-none">=</span>;
}
