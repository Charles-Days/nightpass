'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { PassesStats } from '@/core/types/api';

export function usePasesStats(
  venueId: string,
  range: { from?: string; to?: string },
  initialData: PassesStats,
) {
  const qs = new URLSearchParams();
  if (range.from) qs.set('from', range.from);
  if (range.to) qs.set('to', range.to);
  const queryString = qs.toString();
  return useQuery<PassesStats>({
    queryKey: ['pases-stats', venueId, range.from, range.to],
    queryFn: () =>
      clientFetch<PassesStats>(
        `/api/pases/venues/${venueId}/stats${queryString ? `?${queryString}` : ''}`,
      ),
    initialData,
    staleTime: 30_000,
  });
}
