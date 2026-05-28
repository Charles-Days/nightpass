'use client';
import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { PromoterMe } from '@/core/types/api';

export function usePromoterMe() {
  return useQuery({
    queryKey: ['promoter-me'],
    queryFn: () => clientFetch<PromoterMe>('/api/promoters/me'),
  });
}
