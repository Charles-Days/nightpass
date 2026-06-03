import { Banknote, PiggyBank, CreditCard, Ticket, ScanLine, Coins } from 'lucide-react';
import type { AdminFinanceTotals } from '@/core/types/api';
import { money, intCount, pct } from '../lib/format';

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  /** tailwind color token for orb + icon, e.g. 'purple', 'emerald' */
  accent: 'purple' | 'emerald' | 'sky' | 'amber' | 'pink';
  valueClassName?: string;
}

const ACCENT: Record<KpiCardProps['accent'], { orb: string; icon: string }> = {
  purple: { orb: 'bg-purple-500/10', icon: 'text-purple-400' },
  emerald: { orb: 'bg-emerald-500/10', icon: 'text-emerald-400' },
  sky: { orb: 'bg-sky-500/10', icon: 'text-sky-400' },
  amber: { orb: 'bg-amber-500/10', icon: 'text-amber-400' },
  pink: { orb: 'bg-pink-500/10', icon: 'text-pink-400' },
};

function KpiCard({ label, value, hint, icon, accent, valueClassName }: KpiCardProps) {
  const a = ACCENT[accent];
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.015] p-5 backdrop-blur-xl transition hover:border-white/15">
      <div className={`pointer-events-none absolute -right-6 -bottom-6 size-24 rounded-full blur-2xl ${a.orb}`} />
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={a.icon}>{icon}</span>
      </div>
      <span className={`mt-4 block font-display text-2xl font-extrabold tracking-tight sm:text-[1.65rem] ${valueClassName ?? 'text-white'}`}>
        {value}
      </span>
      {hint ? <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function KpiCards({ totals }: { totals: AdminFinanceTotals }) {
  const soldAdmin = totals.passesSoldAdmin ?? 0;
  const revenueAdmin = totals.revenueAdmin ?? 0;
  const redeemedAdmin = totals.passesRedeemedAdmin ?? 0;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <KpiCard
        label="Ingreso App (Stripe)"
        value={money(totals.grossCents)}
        hint={`${intCount(totals.ordersCount)} órdenes · ticket prom. ${money(totals.avgTicketCents)}`}
        icon={<Banknote className="size-4" />}
        accent="purple"
      />
      <KpiCard
        label="Ingreso efectivo"
        value={money(revenueAdmin)}
        hint={`${intCount(soldAdmin)} pases vendidos en efectivo (RP)`}
        icon={<Coins className="size-4" />}
        accent="emerald"
        valueClassName="text-[#10b981]"
      />
      <KpiCard
        label="Pases vendidos"
        value={intCount(totals.passesSold + soldAdmin)}
        hint={`App ${intCount(totals.passesSold)} · Efectivo ${intCount(soldAdmin)}`}
        icon={<Ticket className="size-4" />}
        accent="pink"
      />
      <KpiCard
        label="Comisión NightPass"
        value={money(totals.platformFeeCents)}
        hint="Neto que retiene la plataforma"
        icon={<PiggyBank className="size-4" />}
        accent="emerald"
        valueClassName="text-[#10b981]"
      />
      <KpiCard
        label="Fee Stripe (estimado)"
        value={money(totals.stripeFeeEstCents)}
        hint="Cálculo aproximado — no facturado"
        icon={<CreditCard className="size-4" />}
        accent="sky"
      />
      <KpiCard
        label="Tasa de canje"
        value={pct(totals.redeemRate)}
        hint={`${intCount(totals.passesRedeemed + redeemedAdmin)} de ${intCount(
          totals.passesSold + soldAdmin,
        )} canjeados`}
        icon={<ScanLine className="size-4" />}
        accent="amber"
      />
    </div>
  );
}
