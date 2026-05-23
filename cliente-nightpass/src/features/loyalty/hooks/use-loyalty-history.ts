'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { LoyaltyEntry } from '@/core/types/api';

export function useLoyaltyHistory(limit = 50) {
  return useQuery<LoyaltyEntry[]>({
    queryKey: ['loyalty', 'history', limit],
    queryFn: () =>
      clientFetch<LoyaltyEntry[]>(`/api/loyalty/history?limit=${limit}`),
    staleTime: 60_000,
    retry: (failureCount, err) => {
      const status = (err as { status?: number } | null)?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });
}
