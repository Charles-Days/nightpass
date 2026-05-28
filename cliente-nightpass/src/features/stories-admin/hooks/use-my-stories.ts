'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { Story } from '@/core/types/api';

export function useMyStories(venueId: string, initialData?: Story[]) {
  const hasInitial = Array.isArray(initialData) && initialData.length > 0;
  return useQuery<Story[]>({
    queryKey: ['stories-mine', venueId],
    queryFn: () => clientFetch<Story[]>(`/api/stories/mine?venueId=${venueId}`),
    initialData: hasInitial ? initialData : undefined,
    staleTime: hasInitial ? 30_000 : 0,
    enabled: !!venueId,
  });
}
