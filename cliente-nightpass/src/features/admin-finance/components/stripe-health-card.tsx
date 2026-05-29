import { Plug, AlertTriangle, RotateCcw, XCircle } from 'lucide-react';
import type { AdminFinanceStripeHealth } from '@/core/types/api';
import { intCount, money } from '../lib/format';

function Ratio({
  label,
  connected,
  total,
}: {
  label: string;
  connected: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((connected / total) * 100) : 0;
  const allConnected = total > 0 && connected >= total;
  const warn = !allConnected;
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.015] p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {warn ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
            <AlertTriangle className="size-3" />
            Pendientes
          </span>
        ) : (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
            Completo
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold text-white">
        {intCount(connected)}
        <span className="text-base font-bold text-muted-foreground"> / {intCount(total)}</span>
      </p>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full ${
            allConnected
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
              : 'bg-gradient-to-r from-amber-500 to-amber-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{pct}% conectados a Stripe</p>
    </div>
  );
}

export function StripeHealthCard({
  health,
  refundedCount,
  refundedAmountCents,
  failedCount,
}: {
  health: AdminFinanceStripeHealth;
  refundedCount: number;
  refundedAmountCents: number;
  failedCount: number;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Infraestructura de cobro</p>
          <h2 className="mt-1 font-display text-lg font-bold tracking-tight">Salud de Stripe</h2>
        </div>
        <Plug className="size-5 text-purple-400" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Ratio label="Locales conectados" connected={health.venuesConnected} total={health.venuesTotal} />
        <Ratio label="Organizadores conectados" connected={health.promotersConnected} total={health.promotersTotal} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            refundedCount > 0
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              : 'border-white/10 bg-white/[0.02] text-muted-foreground'
          }`}
        >
          <RotateCcw className="size-3.5" />
          {intCount(refundedCount)} reembolsos · {money(refundedAmountCents)}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            failedCount > 0
              ? 'border-red-500/30 bg-red-500/10 text-red-300'
              : 'border-white/10 bg-white/[0.02] text-muted-foreground'
          }`}
        >
          <XCircle className="size-3.5" />
          {intCount(failedCount)} pagos fallidos
        </span>
      </div>
    </div>
  );
}
