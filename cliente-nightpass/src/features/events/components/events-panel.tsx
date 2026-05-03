'use client';

import * as React from 'react';
import { BarChart3, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { useEvents } from '../hooks/use-events';
import { useDeleteEvent } from '../hooks/use-delete-event';
import { EventStatusBadge } from './event-status-badge';
import { EventForm } from './event-form';
import { EventSalesDialog } from './event-sales-dialog';
import type { Event } from '@/core/types/api';
import type { CreateEventInput } from '../schemas/event.schema';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
}

function toDefaultValues(event: Event): Partial<CreateEventInput> {
  return {
    title: event.title,
    description: event.description ?? '',
    startsAt: event.startsAt.slice(0, 16),
    endsAt: event.endsAt.slice(0, 16),
    coverImageUrl: event.coverImageUrl ?? '',
    status: event.status,
    capacity: event.capacity ?? undefined,
  };
}

function EventRow({
  event,
  venueId,
  onEdit,
  onSales,
}: {
  event: Event;
  venueId: string;
  onEdit: (e: Event) => void;
  onSales: (e: Event) => void;
}) {
  const deleteEvent = useDeleteEvent(venueId);
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] border border-white/10 bg-white/[0.025] px-3 py-2 text-sm transition-colors hover:bg-white/[0.04]">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{event.title}</p>
        <p className="text-xs text-muted-foreground">{fmtDate(event.startsAt)}</p>
      </div>
      <EventStatusBadge status={event.status} />
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          title="Ver ventas"
          onClick={() => onSales(event)}
        >
          <BarChart3 className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          title="Editar evento"
          onClick={() => onEdit(event)}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0 text-destructive/70 hover:text-destructive"
          title="Eliminar evento"
          disabled={deleteEvent.isPending}
          onClick={() => deleteEvent.mutate(event.id)}
        >
          {deleteEvent.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function EventsPanel({ venueId }: { venueId: string }) {
  const { data, isLoading } = useEvents(venueId);
  const [creating, setCreating] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<Event | null>(null);
  const [salesEvent, setSalesEvent] = React.useState<Event | null>(null);

  return (
    <>
      {/* Modal crear evento */}
      <Dialog open={creating} onOpenChange={(v) => !v && setCreating(false)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nuevo evento</DialogTitle>
          </DialogHeader>
          <EventForm
            venueId={venueId}
            onSuccess={() => setCreating(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal editar evento */}
      <Dialog open={!!editingEvent} onOpenChange={(v) => !v && setEditingEvent(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar: {editingEvent?.title}</DialogTitle>
          </DialogHeader>
          {editingEvent ? (
            <EventForm
              venueId={venueId}
              eventId={editingEvent.id}
              defaultValues={toDefaultValues(editingEvent)}
              onSuccess={() => setEditingEvent(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Panel lista */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total} evento${data.total !== 1 ? 's' : ''}` : '—'}
          </p>
          <Button
            type="button"
            size="sm"
            className="gap-1.5 rounded-full"
            onClick={() => setCreating(true)}
          >
            <Plus className="size-3.5" />
            Nuevo evento
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin eventos aún — crea el primero.
          </p>
        ) : (
          <div className="space-y-2">
            {data.items.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                venueId={venueId}
                onEdit={setEditingEvent}
                onSales={setSalesEvent}
              />
            ))}
          </div>
        )}
      </div>

      <EventSalesDialog
        eventId={salesEvent?.id ?? null}
        eventTitle={salesEvent?.title}
        onClose={() => setSalesEvent(null)}
      />
    </>
  );
}
