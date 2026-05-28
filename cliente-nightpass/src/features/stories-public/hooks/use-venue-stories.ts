'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { Story } from '@/core/types/api';

export function useVenueStories(slug: string | null, initialData?: Story[]) {
  return useQuery<Story[]>({
    queryKey: ['stories-venue', slug],
    queryFn: () => clientFetch<Story[]>(`/api/catalog/venues/${slug}/stories`),
    initialData,
    staleTime: 60_000,
    enabled: !!slug,
  });
}
