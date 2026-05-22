import { redirect } from 'next/navigation';
import { serverFetch } from '@/core/lib/api/server-client';
import { StaffTable, InviteStaffForm } from '@/features/staff';
import type { Venue, User } from '@/core/types/api';
import { paths } from '@/core/config/paths';

export const metadata = { title: 'Mi staff' };

type VenueWithCount = Venue & {
  _count: { events: number; staff: number };
};

export default async function MiLocalStaffPage() {
  const user = await serverFetch<User>('/auth/me');
  if (user.role === 'VENUE_STAFF') redirect(paths.miLocalEventos);

  const venues = await serverFetch<VenueWithCount[]>('/venues/my');
  const venue = venues[0] as VenueWithCount | undefined;

  if (!venue) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Mi local
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Mi staff</h1>
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          {venue.name}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Mi staff</h1>
        <p className="text-sm text-muted-foreground">
          Invita y gestiona el equipo de tu local.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="rounded-[22px] border border-white/10 bg-white/[0.025] p-6">
          <p className="mb-4 text-sm font-medium">Miembros actuales</p>
          <StaffTable venueId={venue.id} />
        </section>

        <section className="rounded-[22px] border border-white/10 bg-white/[0.025] p-6">
          <p className="mb-4 text-sm font-medium">Invitar nuevo miembro</p>
          <InviteStaffForm venueId={venue.id} />
        </section>
      </div>
    </div>
  );
}
