'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { AdminEventDetail } from '@/core/types/api';

export function useAdminEventDetail(eventId: string | null) {
  return useQuery<AdminEventDetail>({
    queryKey: ['admin-event-detail', eventId],
    queryFn: () => clientFetch<AdminEventDetail>(`/api/admin/finance/events/${eventId}`),
    enabled: !!eventId,
    staleTime: 30_000,
  });
}
