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

function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon: React.ElementType;
}) {
  return (
    <Card className="rounded-[22px] border border-white/10 bg-white/[0.025] transition-colors hover:bg-white/[0.04]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-primary/60" />
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="bg-gradient-to-br from-white to-purple-200 bg-clip-text font-display text-3xl font-bold text-transparent">
          {value}
        </p>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </CardContent>
    </Card>
  );
}

export function KpiCards({ stats }: { stats: PassesStats }) {
  const redeemPct = Math.round(stats.redeemRate * 100);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label="Pases vendidos" value={stats.passesSold} icon={Ticket} />
      <KpiCard
        label="Ingresos brutos"
        value={fmtMxn(stats.totalRevenue)}
        subtitle={`Fee NightPass: ${fmtMxn(stats.totalFees)}`}
        icon={Coins}
      />
      <KpiCard
        label="Canjeados"
        value={`${stats.passesRedeemed} / ${stats.passesSold}`}
        subtitle={`${redeemPct}%`}
        icon={CheckCircle2}
      />
      <KpiCard
        label="Próximo evento"
        value={
          stats.upcomingEvent ? (
            <span className="block truncate text-2xl">{stats.upcomingEvent.title}</span>
          ) : (
            <span className="text-2xl text-muted-foreground">—</span>
          )
        }
        subtitle={
          stats.upcomingEvent ? (
            <>
              {fmtEventDate(stats.upcomingEvent.startsAt)} · {stats.upcomingEvent.vendidos} pases
            </>
          ) : (
            'Sin eventos próximos'
          )
        }
        icon={Calendar}
      />
    </div>
  );
}
