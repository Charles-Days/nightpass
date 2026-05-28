'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { Story } from '@/core/types/api';

interface VenueStoriesResponse {
  venueId: string;
  venueSlug: string;
  venueName: string;
  venueCoverImageUrl: string | null;
  stories: Story[];
}

export function useVenueStories(slug: string | null, initialData?: Story[]) {
  return useQuery<Story[]>({
    queryKey: ['stories-venue', slug],
    queryFn: async () => {
      const res = await clientFetch<VenueStoriesResponse | Story[]>(
        `/api/catalog/venues/${slug}/stories`,
      );
      // Backend devuelve {venueId, ..., stories: []}. Soportamos también la
      // forma plana por si algún consumidor antiguo del proxy la entrega así.
      return Array.isArray(res) ? res : (res?.stories ?? []);
    },
    initialData,
    staleTime: 60_000,
    enabled: !!slug,
  });
}
