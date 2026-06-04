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
  const user = await serverFetch<User>('/auth/me', { revalidate: 60 });
  if (user.role !== 'VENUE_OWNER' && user.role !== 'VENUE_STAFF' && user.role !== 'ADMIN') {
    redirect(paths.dashboard);
  }

  const venues = await serverFetch<Venue[]>('/venues/my', { revalidate: 300 });
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
        <div className="rounded-[22px] border border-white/14 bg-white/[0.05] p-10 text-center text-sm text-muted-foreground">
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
  // Stats son analíticas tolerantes a staleness; PasesDashboard refetchea en
  // cliente al cambiar el rango. Cacheamos 120s para deduplicar navegaciones.
  const initialStats = await serverFetch<PassesStats>(path, { revalidate: 120 });

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
