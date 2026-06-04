import { serverFetch } from '@/core/lib/api/server-client';
import { EventsPanel } from '@/features/events';
import type { Venue } from '@/core/types/api';

export const metadata = { title: 'Mis eventos' };

type VenueWithCount = Venue & {
  _count: { events: number; staff: number };
};

export default async function MiLocalEventosPage() {
  // Solo se usa para resolver el venue.id que se pasa a <EventsPanel> (client,
  // fetchea sus propios eventos). El vínculo usuario→local es muy estable.
  const venues = await serverFetch<VenueWithCount[]>('/venues/my', { revalidate: 300 });
  const venue = venues[0] as VenueWithCount | undefined;

  if (!venue) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Mi local
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Mis eventos</h1>
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
        <h1 className="font-display text-3xl font-bold tracking-tight">Mis eventos</h1>
        <p className="text-sm text-muted-foreground">
          Crea y gestiona los eventos de tu local.
        </p>
      </header>

      <div className="rounded-[22px] border border-white/14 bg-white/[0.05] p-6">
        <EventsPanel venueId={venue.id} />
      </div>
    </div>
  );
}
