'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { clientFetch, ClientApiError } from '@/core/lib/api/client-client';
import { CollapsibleCard } from '@/core/components/ui/collapsible-card';
import type { Event } from '@/core/types/api';
import { EventForm } from './event-form';
import { EventFormPromoter, toPromoterEventDefaults } from './event-form-promoter';
import { TiersSection } from './tiers-section';

function venueDefaults(event: Event) {
  return {
    title: event.title,
    description: event.description ?? '',
    startsAt: event.startsAt.slice(0, 16),
    endsAt: event.endsAt.slice(0, 16),
    coverImageUrl: event.coverImageUrl ?? '',
    flyerImageUrl: event.flyerImageUrl ?? '',
    status: event.status,
    capacity: event.capacity ?? undefined,
  };
}

/**
 * Edición de un evento desde el panel ADMIN — sirve para eventos de cualquier
 * organizador o local (el backend deja al ADMIN saltarse la propiedad). Reusa
 * el form del dueño (venue o promoter) + la sección de tiers.
 */
export function AdminEventEdit({ event, onDone }: { event: Event; onDone: () => void }) {
  const qc = useQueryClient();
  const isPromoter = !!event.promoterId;

  // PATCH genérico para el form de promoter (que delega el submit al padre).
  const patch = useMutation({
    mutationFn: (input: Record<string, unknown>) => {
      const {
        venueId: _v,
        promoterId: _p,
        externalVenueName: _n,
        externalVenueAddress: _a,
        externalVenueCity: _c,
        externalVenueLat: _lat,
        externalVenueLng: _lng,
        ...rest
      } = input;
      return clientFetch<Event>(`/api/events/${event.id}`, { method: 'PATCH', body: rest });
    },
    onSuccess: () => {
      toast.success('Evento actualizado');
      qc.invalidateQueries({ queryKey: ['events'] });
      onDone();
    },
    onError: (err) =>
      toast.error(
        err instanceof ClientApiError && err.status === 404
          ? 'Evento no encontrado'
          : 'No pudimos actualizar el evento',
      ),
  });

  return (
    <div className="space-y-4">
      <CollapsibleCard
        icon={<Calendar className="size-4 text-primary" />}
        title="Información del evento"
        defaultOpen
      >
        {isPromoter ? (
          <EventFormPromoter
            promoterId={event.promoterId!}
            eventId={event.id}
            defaultValues={toPromoterEventDefaults(event)}
            locationLocked
            onSubmit={(payload) => patch.mutate(payload)}
            isPending={patch.isPending}
            submitLabel="Guardar cambios"
          />
        ) : (
          <EventForm
            venueId={event.venueId!}
            eventId={event.id}
            defaultValues={venueDefaults(event)}
            showTiers={false}
            onSuccess={() => {
              qc.invalidateQueries({ queryKey: ['events'] });
              onDone();
            }}
          />
        )}
      </CollapsibleCard>

      <CollapsibleCard
        icon={<Tag className="size-4 text-primary" />}
        title="Tiers de precio"
        defaultOpen
      >
        <TiersSection eventId={event.id} />
      </CollapsibleCard>
    </div>
  );
}
