'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';

export interface MyReferral {
  code: string;
  referredCount: number;
  pointsEarned: number;
}

/** Mi código de invitación + stats. Solo se pide cuando `enabled` (al abrir el diálogo). */
export function useMyReferral(enabled = true) {
  return useQuery({
    queryKey: ['my-referral'],
    enabled,
    queryFn: () => clientFetch<MyReferral>('/api/referral/me'),
    staleTime: 60_000,
  });
}
