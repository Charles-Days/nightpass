'use client';

import { Calendar, CheckCircle2, Coins, Ticket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/components/ui/card';
import type { PassesStats } from '@/core/types/api';

const mxnFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

function fmtMxn(cents: number) {
  return mxnFormatter.format(cents / 100);
}

function fmtEventDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CardShell({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-[22px] border border-white/10 bg-white/[0.025] transition-colors hover:bg-white/[0.04]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-primary/60" />
      </CardHeader>
      <CardContent className="space-y-1">{children}</CardContent>
    </Card>
  );
}

/** Tarjeta con dos cifras lado a lado: App (Stripe) | Efectivo (RP/admin). */
function SplitKpiCard({
  label,
  icon,
  appValue,
  cashValue,
}: {
  label: string;
  icon: React.ElementType;
  appValue: React.ReactNode;
  cashValue: React.ReactNode;
}) {
  return (
    <CardShell label={label} icon={icon}>
      <div className="flex items-stretch gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            App
          </p>
          <p className="truncate bg-gradient-to-br from-white to-purple-200 bg-clip-text font-display text-2xl font-bold text-transparent">
            {appValue}
          </p>
        </div>
        <div className="w-px shrink-0 self-stretch bg-white/10" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300/80">
            Efectivo
          </p>
          <p className="truncate bg-gradient-to-br from-white to-emerald-200 bg-clip-text font-display text-2xl font-bold text-transparent">
            {cashValue}
          </p>
        </div>
      </div>
    </CardShell>
  );
}

function SimpleKpiCard({
  label,
  icon,
  value,
  subtitle,
}: {
  label: string;
  icon: React.ElementType;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <CardShell label={label} icon={icon}>
      <p className="bg-gradient-to-br from-white to-purple-200 bg-clip-text font-display text-3xl font-bold text-transparent">
        {value}
      </p>
      {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
    </CardShell>
  );
}

export function KpiCards({ stats }: { stats: PassesStats }) {
  const soldAdmin = stats.passesSoldAdmin ?? 0;
  const revenueAdmin = stats.revenueAdmin ?? 0;
  const redeemedAdmin = stats.passesRedeemedAdmin ?? 0;

  const totalSold = stats.passesSold + soldAdmin;
  const totalRedeemed = stats.passesRedeemed + redeemedAdmin;
  const redeemPct = totalSold > 0 ? Math.round((totalRedeemed / totalSold) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SplitKpiCard
        label="Pases vendidos"
        icon={Ticket}
        appValue={stats.passesSold}
        cashValue={soldAdmin}
      />
      <SplitKpiCard
        label="Ingresos brutos"
        icon={Coins}
        appValue={fmtMxn(stats.totalRevenue)}
        cashValue={fmtMxn(revenueAdmin)}
      />
      <SimpleKpiCard
        label="Canjeados (App + Efectivo)"
        icon={CheckCircle2}
        value={`${totalRedeemed} / ${totalSold}`}
        subtitle={`${redeemPct}% · App ${stats.passesRedeemed} · Efectivo ${redeemedAdmin}`}
      />
      <SimpleKpiCard
        label="Próximo evento"
        icon={Calendar}
        value={
          stats.upcomingEvent ? (
            <span className="block truncate text-2xl">{stats.upcomingEvent.title}</span>
          ) : (
            <span className="text-2xl text-muted-foreground">—</span>
          )
        }
        subtitle={
          stats.upcomingEvent
            ? `${fmtEventDate(stats.upcomingEvent.startsAt)} · ${stats.upcomingEvent.vendidos} pases`
            : 'Sin eventos próximos'
        }
      />
    </div>
  );
}
