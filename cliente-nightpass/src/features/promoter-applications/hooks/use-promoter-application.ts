'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { PromoterApplication } from '@/core/types/api';

export function usePromoterApplication(id: string | null) {
  return useQuery({
    queryKey: ['promoter-applications', id],
    queryFn: () => clientFetch<PromoterApplication>(`/api/promoter-applications/${id}`),
    enabled: !!id,
  });
}
