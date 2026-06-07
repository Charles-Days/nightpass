import { serverFetch } from '@/core/lib/api/server-client';
import { RewardsManager } from '@/features/rewards-admin';
import type { Venue } from '@/core/types/api';

export const metadata = { title: 'Recompensas' };

type VenueWithCount = Venue & { _count: { events: number; staff: number } };

export default async function MiLocalRecompensasPage() {
  const venues = await serverFetch<VenueWithCount[]>('/venues/my', { revalidate: 300 });
  const venue = venues[0] as VenueWithCount | undefined;

  if (!venue) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Mi local
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Recompensas</h1>
          <p className="text-sm text-muted-foreground">
            No hay un local vinculado a tu cuenta. Contacta al administrador.
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          {venue.name}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Recompensas</h1>
        <p className="text-sm text-muted-foreground">
          Define qué pueden canjear tus clientes con sus NPP y valida sus cupones.
        </p>
      </header>

      <div className="rounded-[22px] border border-white/14 bg-white/[0.05] p-6">
        <RewardsManager venueId={venue.id} />
      </div>
    </div>
  );
}
