'use client';
import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { PromoterStaffMember } from '@/core/types/api';

export function usePromoterStaff() {
  return useQuery({
    queryKey: ['promoter-staff'],
    queryFn: () => clientFetch<PromoterStaffMember[]>('/api/promoters/me/staff'),
  });
}
