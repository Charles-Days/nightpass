'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { LeaderboardEntry } from '@/core/types/api';

export function useLeaderboard(city: string | null | undefined) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', city],
    queryFn: () =>
      clientFetch<LeaderboardEntry[]>(
        `/api/leaderboard/${encodeURIComponent(city ?? '')}`,
      ),
    enabled: !!city,
    staleTime: 5 * 60_000,
    retry: (failureCount, err) => {
      const status = (err as { status?: number } | null)?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });
}
