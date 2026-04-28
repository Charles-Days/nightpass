'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { VenueApplication } from '@/core/types/api';

export function useApplication(id: string | null) {
  return useQuery({
    queryKey: ['venue-applications', id],
    queryFn: () => clientFetch<VenueApplication>(`/api/venue-applications/${id}`),
    enabled: !!id,
  });
}
