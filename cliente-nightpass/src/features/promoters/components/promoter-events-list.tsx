'use client';

import * as React from 'react';
import Link from 'next/link';
import { Calendar, Loader2, MapPin, Pencil, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/core/components/ui/button';
import { clientFetch } from '@/core/lib/api/client-client';
import { paths } from '@/core/config/paths';
import type { Event, PaginatedEvents } from '@/core/types/api';
import { EventStatusBadge } from '@/features/events';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function locationLabel(event: Event): string {
  if (event.venue) return `${event.venue.name} · ${event.venue.city}`;
  if (event.externalVenueName) {
    const city = event.externalVenueCity ?? '';
    return city
      ? `${event.externalVenueName} · ${city}`
      : event.externalVenueName;
  }
  return '—';
}

export function PromoterEventsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['events', 'promoter-me'],
    queryFn: () =>
      clientFetch<PaginatedEvents>('/api/events?limit=100'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data ? `${data.total} evento${data.total !== 1 ? 's' : ''}` : '—'}
        </p>
        <Button asChild size="sm" className="gap-1.5 rounded-full">
          <Link href={paths.miOrganizadorEventosNuevo}>
            <Plus className="size-3.5" />
            Nuevo evento
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-white/18 bg-white/[0.035] px-6 py-12 text-center">
          <Calendar className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Aún no tienes eventos.
          </p>
          <Button asChild size="sm" className="mt-4 gap-1.5 rounded-full">
            <Link href={paths.miOrganizadorEventosNuevo}>
              <Plus className="size-3.5" />
              Crear el primero
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {data.items.map((event) => (
            <Link
              key={event.id}
              href={`${paths.miOrganizadorEventos}/${event.id}`}
              className="flex items-center justify-between gap-3 rounded-[14px] border border-white/14 bg-white/[0.05] px-4 py-3 text-sm transition-colors hover:bg-white/[0.08]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtDate(event.startsAt)}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground/80">
                  <MapPin className="size-3" />
                  {locationLabel(event)}
                </p>
              </div>
              <EventStatusBadge status={event.status} />
              <Pencil className="size-3.5 text-muted-foreground/70" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
