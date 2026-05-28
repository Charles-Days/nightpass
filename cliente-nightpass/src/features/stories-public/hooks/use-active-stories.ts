'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { VenueStoriesGroup } from '@/core/types/api';

export function useActiveStories(initialData?: VenueStoriesGroup[]) {
  return useQuery<VenueStoriesGroup[]>({
    queryKey: ['stories-active'],
    queryFn: () => clientFetch<VenueStoriesGroup[]>('/api/catalog/stories/active'),
    initialData,
    staleTime: 60_000,
  });
}
