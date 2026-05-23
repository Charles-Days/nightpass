'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { LoyaltyStatus } from '@/core/types/api';

export function useLoyaltyStatus(opts?: { enabled?: boolean }) {
  return useQuery<LoyaltyStatus>({
    queryKey: ['loyalty', 'status'],
    queryFn: () => clientFetch<LoyaltyStatus>('/api/loyalty/me'),
    staleTime: 60_000,
    enabled: opts?.enabled ?? true,
    retry: (failureCount, err) => {
      const status = (err as { status?: number } | null)?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });
}
