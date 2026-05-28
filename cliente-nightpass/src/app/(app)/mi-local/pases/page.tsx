import { redirect } from 'next/navigation';
import { serverFetch } from '@/core/lib/api/server-client';
import type { User, Venue, PassesStats } from '@/core/types/api';
import { paths } from '@/core/config/paths';
import { PasesDashboard } from '@/features/passes-dashboard';

export const metadata = { title: 'Pases · NightPass Admin' };

export default async function MiLocalPasesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await serverFetch<User>('/auth/me');
  if (user.role !== 'VENUE_OWNER' && user.role !== 'VENUE_STAFF' && user.role !== 'ADMIN') {
    redirect(paths.dashboard);
  }

  const venues = await serverFetch<Venue[]>('/venues/my');
  const venue = venues[0];
  if (!venue) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Mi local
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Pases</h1>
        </header>
        <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-10 text-center text-sm text-muted-foreground">
          Aún no tienes un local asignado.
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.from) qs.set('from', sp.from);
  if (sp.to) qs.set('to', sp.to);
  const path = `/pases/venues/${venue.id}/stats${qs.toString() ? `?${qs}` : ''}`;
  const initialStats = await serverFetch<PassesStats>(path);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Mi local
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Pases vendidos</h1>
        <p className="text-sm text-muted-foreground">
          Resumen de pases, ingresos y canjes de {venue.name}.
        </p>
      </header>
      <PasesDashboard venueId={venue.id} initialStats={initialStats} />
    </div>
  );
}
