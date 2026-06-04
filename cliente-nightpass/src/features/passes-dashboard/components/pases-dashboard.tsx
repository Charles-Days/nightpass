'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import type { PassesStats } from '@/core/types/api';
import { usePasesStats } from '../hooks/use-pases-stats';
import { KpiCards } from './kpi-cards';
import { DatePresets } from './date-presets';
import { EventsTable } from './events-table';
import { TierDrilldownDialog } from './tier-drilldown-dialog';
import { ExportCsvButton } from './export-csv-button';

const SalesChart = dynamic(() => import('./sales-chart').then((m) => m.SalesChart), {
  ssr: false,
  loading: () => <div className="h-[260px] rounded-[22px] border border-white/14 bg-white/[0.05]" />,
});
const RedeemedDonut = dynamic(
  () => import('./redeemed-donut').then((m) => m.RedeemedDonut),
  {
    ssr: false,
    loading: () => <div className="h-[260px] rounded-[22px] border border-white/14 bg-white/[0.05]" />,
  },
);

export function PasesDashboard({
  venueId,
  initialStats,
}: {
  venueId: string;
  initialStats: PassesStats;
}) {
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;

  const { data: stats } = usePasesStats(venueId, { from, to }, initialStats);
  const view = stats ?? initialStats;

  const [activeEventId, setActiveEventId] = React.useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DatePresets />
        <ExportCsvButton venueId={venueId} />
      </div>

      <KpiCards stats={view} />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <SalesChart data={view.dailySeries} />
        <RedeemedDonut stats={view} />
      </div>

      <EventsTable rows={view.byEvent} onRowClick={setActiveEventId} />

      <TierDrilldownDialog
        venueId={venueId}
        eventId={activeEventId}
        range={{ from, to }}
        onClose={() => setActiveEventId(null)}
      />
    </div>
  );
}
