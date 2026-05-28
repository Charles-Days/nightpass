'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { EventTierBreakdown } from '@/core/types/api';

export function useEventDrilldown(
  venueId: string,
  eventId: string | null,
  range: { from?: string; to?: string },
) {
  const qs = new URLSearchParams();
  if (range.from) qs.set('from', range.from);
  if (range.to) qs.set('to', range.to);
  const queryString = qs.toString();
  return useQuery<EventTierBreakdown>({
    queryKey: ['pases-event-drilldown', venueId, eventId, range.from, range.to],
    queryFn: () =>
      clientFetch<EventTierBreakdown>(
        `/api/pases/venues/${venueId}/events/${eventId}${queryString ? `?${queryString}` : ''}`,
      ),
    enabled: !!eventId,
    staleTime: 30_000,
  });
}
