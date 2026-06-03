'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { Event } from '@/core/types/api';
import { paths } from '@/core/config/paths';
import {
  EventFormPromoter,
  TiersSection,
  toPromoterEventDefaults,
} from '@/features/events';
import { Button } from '@/core/components/ui/button';
import { CollapsibleCard } from '@/core/components/ui/collapsible-card';
import { Calendar, Loader2, Tag, Trash2 } from 'lucide-react';

function readError(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 404) return 'Evento no encontrado';
  }
  return 'No pudimos actualizar el evento';
}

export function PromoterEventEdit({
  promoterId,
  eventId,
}: {
  promoterId: string;
  eventId: string;
}) {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ['events', 'detail', eventId],
    queryFn: () => clientFetch<Event>(`/api/events/${eventId}`),
  });

  const update = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      clientFetch<Event>(`/api/events/${eventId}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: () => {
      toast.success('Evento actualizado');
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['events', 'detail', eventId] });
    },
    onError: (err) => toast.error(readError(err)),
  });

  const remove = useMutation({
    mutationFn: () =>
      clientFetch<{ ok: boolean }>(`/api/events/${eventId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success('Evento eliminado');
      qc.invalidateQueries({ queryKey: ['events'] });
      router.push(paths.miOrganizadorEventos);
    },
    onError: () => toast.error('No pudimos eliminar el evento'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!event) {
    return <p className="text-sm text-muted-foreground">Evento no encontrado.</p>;
  }

  // venueId/promoterId no van en UpdateEventDto (no se puede cambiar de venue del
  // catálogo en edición) → se quitan. Los campos de venue EXTERNO sí se permiten:
  // el backend los persiste para eventos del organizador (fecha, hora y ubicación
  // externa son editables).
  const handleSubmit = async (payload: Record<string, unknown>) => {
    const { venueId: _v, promoterId: _p, ...rest } = payload;
    await update.mutateAsync(rest);
  };

  return (
    <div className="space-y-4">
      <CollapsibleCard
        icon={<Calendar className="size-4 text-primary" />}
        title="Información del evento"
        defaultOpen
      >
        <EventFormPromoter
          promoterId={promoterId}
          eventId={eventId}
          defaultValues={toPromoterEventDefaults(event)}
          locationLocked
          onSubmit={handleSubmit}
          isPending={update.isPending}
          submitLabel="Guardar cambios"
        />
      </CollapsibleCard>

      <CollapsibleCard
        icon={<Tag className="size-4 text-primary" />}
        title="Tiers de precio"
        defaultOpen
      >
        <TiersSection eventId={eventId} />
      </CollapsibleCard>

      <div className="flex justify-end border-t border-white/8 pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-destructive/70 hover:text-destructive"
          disabled={remove.isPending}
          onClick={() => {
            if (
              window.confirm(
                '¿Eliminar evento? Esta acción no se puede deshacer.',
              )
            ) {
              remove.mutate();
            }
          }}
        >
          {remove.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
          Eliminar evento
        </Button>
      </div>
    </div>
  );
}
