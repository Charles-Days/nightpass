'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Tag, Banknote, Flame } from 'lucide-react';
import { toast } from 'sonner';
import { clientFetch, ClientApiError } from '@/core/lib/api/client-client';
import { CollapsibleCard } from '@/core/components/ui/collapsible-card';
import { Button } from '@/core/components/ui/button';
import type { Event } from '@/core/types/api';
import { EventForm } from './event-form';
import { EventFormPromoter, toPromoterEventDefaults } from './event-form-promoter';
import { TiersSection } from './tiers-section';
import { CashPaymentSection } from './cash-payment-section';
import { EventNotifyCard } from './event-notify-card';

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
  // venueId/promoterId no van en UpdateEventDto → se quitan. Los campos de venue
  // EXTERNO sí se envían: el backend los persiste para eventos del organizador
  // (ubicación externa editable).
  const patch = useMutation({
    mutationFn: (input: Record<string, unknown>) => {
      const { venueId: _v, promoterId: _p, ...rest } = input;
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

      <CollapsibleCard
        icon={<Banknote className="size-4 text-primary" />}
        title="Pago en efectivo (RP)"
      >
        <CashPaymentSection eventId={event.id} />
      </CollapsibleCard>

      <CollapsibleCard
        icon={<Flame className="size-4 text-primary" />}
        title="Aforo (FOMO)"
      >
        <AforoBoostSection event={event} />
      </CollapsibleCard>

      <EventNotifyCard eventId={event.id} />
    </div>
  );
}

/**
 * Control SOLO admin para inflar el "% lleno" que ve el público (marketing).
 * Se suma al porcentaje real (capado a 100). NO toca el aforo real ni el cupo:
 * no causa sobreventa, es puramente visual.
 */
function AforoBoostSection({ event }: { event: Event }) {
  const qc = useQueryClient();
  const [boost, setBoost] = useState(event.aforoBoostPct ?? 0);

  const save = useMutation({
    mutationFn: (aforoBoostPct: number) =>
      clientFetch<Event>(`/api/events/${event.id}`, {
        method: 'PATCH',
        body: { aforoBoostPct },
      }),
    onSuccess: () => {
      toast.success('Aforo visual actualizado');
      qc.invalidateQueries({ queryKey: ['events'] });
    },
    onError: () => toast.error('No pudimos actualizar el aforo'),
  });

  const clamped = Math.max(0, Math.min(100, Number.isFinite(boost) ? boost : 0));

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Suma un porcentaje al <strong className="text-foreground">% lleno</strong> que ve el público,
        para crear urgencia. Es solo visual: no cambia el aforo real ni el cupo, no causa sobreventa.
      </p>
      <div className="flex items-end gap-3">
        <label className="flex-1">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Boost de aforo (%)
          </span>
          <input
            type="number"
            min={0}
            max={100}
            value={boost}
            onChange={(e) => setBoost(e.target.valueAsNumber)}
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </label>
        <Button
          type="button"
          onClick={() => save.mutate(clamped)}
          disabled={save.isPending || clamped === (event.aforoBoostPct ?? 0)}
        >
          {save.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Ej.: real 3% + boost 50 → se muestra <strong className="text-foreground">53% lleno</strong>.
        0 = sin boost.
      </p>
    </div>
  );
}
