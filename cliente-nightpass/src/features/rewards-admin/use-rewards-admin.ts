'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';

export interface OwnerReward {
  id: string;
  venueId: string | null;
  promoterId: string | null;
  kind: 'VENUE_PERK' | 'TICKET_DISCOUNT';
  title: string;
  description: string | null;
  costNpp: number;
  discountType: 'NONE' | 'PERCENT' | 'FIXED';
  discountValue: number;
  active: boolean;
  perUserLimit: number | null;
  expiresInH: number;
}

export interface CreateRewardBody {
  venueId?: string;
  promoterId?: string;
  kind: 'VENUE_PERK' | 'TICKET_DISCOUNT';
  title: string;
  description?: string;
  costNpp: number;
  discountType?: 'NONE' | 'PERCENT' | 'FIXED';
  discountValue?: number;
  perUserLimit?: number;
  expiresInH?: number;
  active?: boolean;
}

export interface ValidateResult {
  ok: boolean;
  title: string;
  customer: string;
  usedAt: string;
}

export function useOwnerRewards(venueId?: string, promoterId?: string) {
  const qs = venueId ? `?venueId=${venueId}` : promoterId ? `?promoterId=${promoterId}` : '';
  return useQuery({
    queryKey: ['owner-rewards', venueId ?? promoterId],
    enabled: !!(venueId || promoterId),
    queryFn: () => clientFetch<OwnerReward[]>(`/api/rewards/mine${qs}`),
  });
}

export function useCreateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRewardBody) =>
      clientFetch<OwnerReward>('/api/rewards', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner-rewards'] }),
  });
}

export function useUpdateReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateRewardBody> }) =>
      clientFetch<OwnerReward>(`/api/rewards/${id}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner-rewards'] }),
  });
}

export function useDeleteReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      clientFetch(`/api/rewards/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner-rewards'] }),
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: (code: string) =>
      clientFetch<ValidateResult>('/api/rewards/redemptions/use', {
        method: 'POST',
        body: { code },
      }),
  });
}
