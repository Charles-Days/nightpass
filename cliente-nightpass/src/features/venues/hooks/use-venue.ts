'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { Venue } from '@/core/types/api';

export function useVenue(id: string | null) {
  return useQuery({
    queryKey: ['venues', id],
    queryFn: () => clientFetch<Venue>(`/api/venues/${id}`),
    enabled: !!id,
  });
}
