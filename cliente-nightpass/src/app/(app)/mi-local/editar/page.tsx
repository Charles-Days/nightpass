import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { Venue } from '@/core/types/api';
import { VenueEditForm } from '@/features/venues';

export const metadata = { title: 'Editar local' };

export default async function MiLocalEditarPage() {
  const venues = await serverFetch<Venue[]>('/venues/my');
  const venue = venues[0];

  if (!venue) notFound();

  console.log(`[MiLocalEditarPage] Fetching full details for venue: ${venue.id}`);

  // Fetch full details (photos, etc) because /venues/my might be partial
  const fullVenue = await serverFetch<Venue>(`/venues/${venue.id}`);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href={paths.miLocal}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver a mi local
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight">Editar Información</h1>
        <p className="text-sm text-muted-foreground">
          Actualiza los detalles de {fullVenue.name}
        </p>
      </header>

      <VenueEditForm venue={fullVenue} />
    </div>
  );
}
