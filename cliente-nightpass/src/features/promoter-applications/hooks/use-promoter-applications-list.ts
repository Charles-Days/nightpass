'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { ApplicationStatus, PaginatedPromoterApplications } from '@/core/types/api';

interface ListParams {
  status?: ApplicationStatus;
  page?: number;
  limit?: number;
}

function buildQs(params: ListParams): string {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export function usePromoterApplicationsList(params: ListParams = {}) {
  return useQuery({
    queryKey: ['promoter-applications', 'list', params],
    queryFn: () =>
      clientFetch<PaginatedPromoterApplications>(`/api/promoter-applications${buildQs(params)}`),
  });
}
