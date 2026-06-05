'use client';

import { useRpMeStats } from '@/features/rp/hooks/use-rp';
import { PhysicalRequestsSection } from '@/features/rp/components/physical-requests-section';
import { IssuePassDialog } from '@/features/rp/components/issue-pass-dialog';

export default function RpDashboardPage() {
  const { data: stats } = useRpMeStats();
  const activeEvents = (stats?.eventStats ?? []).filter((e) => !e.isPassed);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-white/5 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Relaciones Públicas
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Solicitudes de boleto
          </h1>
        </div>
        <IssuePassDialog
          events={activeEvents.map((e) => ({ eventId: e.eventId, eventName: e.eventName }))}
        />
      </header>

      <PhysicalRequestsSection />
    </div>
  );
}
