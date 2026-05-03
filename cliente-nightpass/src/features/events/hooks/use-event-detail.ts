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
  });
}
