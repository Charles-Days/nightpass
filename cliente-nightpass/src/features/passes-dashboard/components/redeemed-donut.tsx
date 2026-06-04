'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { PassesStats } from '@/core/types/api';

const COLORS = {
  redeemed: 'oklch(0.62 0.245 296.5)',
  pending: 'rgba(255,255,255,0.15)',
};

export function RedeemedDonut({ stats }: { stats: PassesStats }) {
  const pct = Math.round(stats.redeemRate * 100);
  const data = [
    { name: 'Canjeados', value: stats.passesRedeemed, color: COLORS.redeemed },
    { name: 'Pendientes', value: stats.passesPending, color: COLORS.pending },
  ];
  const hasData = stats.passesSold > 0;

  return (
    <div className="rounded-[22px] border border-white/14 bg-white/[0.05] p-5">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Canje
        </p>
        <h3 className="font-display text-lg font-semibold">Canjeados vs pendientes</h3>
      </div>
      {hasData ? (
        <div className="relative">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  stroke="none"
                  paddingAngle={2}
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="bg-gradient-to-br from-white to-purple-200 bg-clip-text font-display text-3xl font-bold text-transparent">
              {pct}%
            </span>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Canjeados
            </span>
          </div>
          <div className="mt-3 flex justify-center gap-5 text-xs">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: COLORS.redeemed }} />
              <span className="text-muted-foreground">
                Canjeados <span className="text-white/90">{stats.passesRedeemed}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: COLORS.pending }} />
              <span className="text-muted-foreground">
                Pendientes <span className="text-white/90">{stats.passesPending}</span>
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-[230px] items-center justify-center text-sm text-muted-foreground">
          Sin pases en el periodo
        </div>
      )}
    </div>
  );
}
