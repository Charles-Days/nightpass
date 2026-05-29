'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { Event, EventTier } from '@/core/types/api';

export type EventDetail = Event & { tiers: EventTier[] };

export function useEventDetail(eventId: string | undefined) {
  return useQuery<EventDetail>({
    queryKey: ['event-detail', eventId],
    enabled: !!eventId,
    queryFn: () => clientFetch<EventDetail>(`/api/events/${eventId}`),
    // La comisión (platformFeePct de venue/promoter) puede cambiar desde el
    // panel admin. Es dato financiero mostrado en el breakdown del tier —
    // debe estar fresco siempre, no servir el cache de 15 min del default
    // global, que dejaba el % viejo hasta un recargue completo.
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
