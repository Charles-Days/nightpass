'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Loader2, Pencil, Sparkles, Trash2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { clientFetch, ClientApiError } from '@/core/lib/api/client-client';
import { Button } from '@/core/components/ui/button';
import { ConfirmDialog } from '@/core/components/ui/confirm-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/core/components/ui/sheet';
import type { Event, EventStatus, PaginatedEvents } from '@/core/types/api';
import { EventStatusBadge } from './event-status-badge';
import { AdminEventEdit } from './admin-event-edit';
import { GeneratePassDialog } from '@/features/admin-passes/components/generate-pass-dialog';

const FILTERS: { key: string; label: string; status?: EventStatus }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'PUBLISHED', label: 'Publicados', status: 'PUBLISHED' },
  { key: 'DRAFT', label: 'Borradores', status: 'DRAFT' },
  { key: 'CANCELED', label: 'Cancelados', status: 'CANCELED' },
];

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function ownerLabel(event: Event): string {
  if (event.promoter?.name) return `${event.promoter.name} · Organizador`;
  if (event.venue?.name) return `${event.venue.name} · Local`;
  if (event.externalVenueName) return event.externalVenueName;
  return '—';
}

export function AdminEventsView() {
  const qc = useQueryClient();
  const [filter, setFilter] = React.useState('all');
  const [editing, setEditing] = React.useState<Event | null>(null);
  const [deleting, setDeleting] = React.useState<Event | null>(null);

  const status = FILTERS.find((f) => f.key === filter)?.status;

  const { data, isLoading } = useQuery({
    queryKey: ['events', 'admin', filter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' });
      if (status) params.set('status', status);
      return clientFetch<PaginatedEvents>(`/api/events?${params.toString()}`);
    },
  });

  const feature = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) =>
      clientFetch(`/api/events/${id}/${on ? 'feature' : 'unfeature'}`, { method: 'POST' }),
    onSuccess: (_d, v) => {
      toast.success(v.on ? 'Evento destacado' : 'Destacado removido');
      qc.invalidateQueries({ queryKey: ['events'] });
    },
    onError: () => toast.error('No pudimos cambiar el destacado'),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      clientFetch<{ ok: boolean }>(`/api/events/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Evento eliminado');
      qc.invalidateQueries({ queryKey: ['events'] });
      setDeleting(null);
    },
    onError: (err) => {
      // 409 del backend con motivo (ej. pases vendidos) — mostrarlo tal cual.
      const payload = err instanceof ClientApiError ? err.payload : null;
      const m =
        payload && typeof payload === 'object'
          ? (payload as Record<string, unknown>).message
          : null;
      toast.error(
        typeof m === 'string' ? m : 'No pudimos eliminar el evento',
      );
      setDeleting(null);
    },
  });

  const events = data?.items ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={
              filter === f.key
                ? 'rounded-full bg-primary/15 px-4 py-1.5 text-sm font-semibold text-primary'
                : 'rounded-full px-4 py-1.5 text-sm text-muted-foreground transition hover:bg-white/[0.09]'
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[22px] border border-white/14 bg-white/[0.05]">
        <table className="w-full text-sm">
          <thead className="border-b border-white/12 bg-white/[0.035] text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Evento</th>
              <th className="hidden px-4 py-3 font-semibold sm:table-cell">Organizador / Local</th>
              <th className="hidden px-4 py-3 font-semibold md:table-cell">Fecha</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto size-5 animate-spin" />
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No hay eventos.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id} className="border-b border-white/10 hover:bg-white/[0.08]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-medium">
                      {event.isFeatured ? (
                        <Sparkles className="size-3.5 shrink-0 text-primary" />
                      ) : null}
                      {event.title}
                    </div>
                    <p className="text-xs text-muted-foreground sm:hidden">{ownerLabel(event)}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {ownerLabel(event)}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {formatDate(event.startsAt)}
                  </td>
                  <td className="px-4 py-3">
                    <EventStatusBadge status={event.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => setEditing(event)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={event.isFeatured ? 'Quitar destacado' : 'Destacar'}
                        disabled={feature.isPending}
                        onClick={() => feature.mutate({ id: event.id, on: !event.isFeatured })}
                      >
                        <Sparkles
                          className={event.isFeatured ? 'size-4 text-primary' : 'size-4'}
                        />
                      </Button>
                      {event.status === 'PUBLISHED' && (
                        <GeneratePassDialog
                          eventId={event.id}
                          eventName={event.title}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Generar Vale QR"
                              className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                            >
                              <QrCode className="size-4" />
                            </Button>
                          }
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Eliminar"
                        className="text-destructive/70 hover:text-destructive"
                        onClick={() => setDeleting(event)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {data.total} evento{data.total === 1 ? '' : 's'}
        </p>
      ) : null}

      {/* Editar (drawer) */}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-2xl">
          <SheetHeader className="shrink-0 border-b border-white/12 px-6 pb-4 pt-5">
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              {editing?.title}
            </SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {editing ? (
              <AdminEventEdit event={editing} onDone={() => setEditing(null)} />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {/* Eliminar */}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="¿Eliminar evento?"
        description={`Se eliminará "${deleting?.title}" y sus tiers. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={remove.isPending}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id);
        }}
      />
    </div>
  );
}
