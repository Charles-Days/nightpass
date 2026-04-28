'use client';
import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { PaginatedEvents, EventStatus } from '@/core/types/api';

export function useEvents(venueId?: string, status?: EventStatus) {
  const params = new URLSearchParams();
  if (venueId) params.set('venueId', venueId);
  if (status) params.set('status', status);
  return useQuery({
    queryKey: ['events', venueId, status],
    queryFn: () => clientFetch<PaginatedEvents>(`/api/events?${params.toString()}`),
    enabled: !!venueId,
  });
}
