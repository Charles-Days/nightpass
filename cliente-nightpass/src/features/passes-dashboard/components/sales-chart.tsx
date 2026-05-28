'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PassesStatsDailyPoint } from '@/core/types/api';
import { formatDay, formatMoney } from '@/core/lib/format';

interface TooltipPayloadItem {
  payload: PassesStatsDailyPoint & { label?: string };
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0a0a0f]/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <p className="font-medium text-white/90">{formatDay(point.day)}</p>
      <p className="text-muted-foreground">
        Pases: <span className="text-white/90">{point.sales}</span>
      </p>
      <p className="text-muted-foreground">
        Ingresos: <span className="text-white/90">{formatMoney(point.revenue)}</span>
      </p>
    </div>
  );
}

export function SalesChart({ data }: { data: PassesStatsDailyPoint[] }) {
  const hasData = data.length > 0 && data.some((d) => d.sales > 0);

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Ventas diarias
          </p>
          <h3 className="font-display text-lg font-semibold">Pases por día</h3>
        </div>
      </div>
      {hasData ? (
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="day"
                tickFormatter={formatDay}
                stroke="rgba(255,255,255,0.4)"
                tickLine={false}
                axisLine={false}
                style={{ fontSize: 11 }}
              />
              <YAxis
                allowDecimals={false}
                stroke="rgba(255,255,255,0.4)"
                tickLine={false}
                axisLine={false}
                style={{ fontSize: 11 }}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: 'rgba(168,85,247,0.08)' }}
              />
              <Bar dataKey="sales" fill="oklch(0.62 0.245 296.5)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
          Sin ventas en el periodo
        </div>
      )}
    </div>
  );
}
