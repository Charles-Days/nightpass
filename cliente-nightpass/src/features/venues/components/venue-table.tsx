'use client';

import * as React from 'react';
import { Eye, Pause, Play, Store } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import type { PaginatedVenues, Venue } from '@/core/types/api';
import { useSuspendVenue } from '../hooks/use-suspend-venue';
import { useReactivateVenue } from '../hooks/use-reactivate-venue';
import { VenueStatusBadge } from './status-badge';
import { VenueSheet } from './venue-sheet';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'medium' });
}

function VenueRowActions({
  venue,
  onOpen,
}: {
  venue: Venue;
  onOpen: (id: string) => void;
}) {
  const suspend = useSuspendVenue(venue.id);
  const reactivate = useReactivateVenue(venue.id);
  const isMutating = suspend.isPending || reactivate.isPending;

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="size-8 p-0 text-muted-foreground hover:text-foreground"
        title="Ver / editar"
        onClick={() => onOpen(venue.id)}
      >
        <Eye className="size-4" />
      </Button>

      {venue.status === 'ACTIVE' ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0 text-destructive/60 hover:text-destructive"
          title="Suspender"
          disabled={isMutating}
          onClick={() => suspend.mutate()}
        >
          <Pause className="size-4" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0 text-emerald-500/60 hover:text-emerald-400"
          title="Reactivar"
          disabled={isMutating}
          onClick={() => reactivate.mutate()}
        >
          <Play className="size-4" />
        </Button>
      )}
    </div>
  );
}

export function VenueTable({ data }: { data: PaginatedVenues }) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  if (data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.025] py-16 text-center">
        <Store className="size-8 text-muted-foreground/60" />
        <p className="font-medium">Sin locales</p>
        <p className="text-sm text-muted-foreground">
          No hay locales que coincidan con los filtros.
        </p>
      </div>
    );
  }

  return (
    <>
      <VenueSheet venueId={activeId} onClose={() => setActiveId(null)} />

      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/8 bg-white/[0.02] text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Local</th>
              <th className="px-4 py-3 font-medium">Ciudad</th>
              <th className="px-4 py-3 font-medium">Dueños</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Creado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((venue) => (
              <tr
                key={venue.id}
                className="cursor-pointer border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.05]"
                onClick={() => setActiveId(venue.id)}
              >
                <td className="px-4 py-3 font-medium">{venue.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{venue.city}</td>
                <td className="px-4 py-3 text-muted-foreground">{venue._count?.owners ?? 0}</td>
                <td className="px-4 py-3">
                  <VenueStatusBadge status={venue.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(venue.createdAt)}</td>
                <td
                  className="px-2 py-2 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <VenueRowActions venue={venue} onOpen={setActiveId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
