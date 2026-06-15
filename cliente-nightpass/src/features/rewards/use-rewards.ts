'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';

export type RewardKind = 'VENUE_PERK' | 'TICKET_DISCOUNT';
export type RewardDiscountType = 'NONE' | 'PERCENT' | 'FIXED';

export interface AvailableReward {
  id: string;
  kind: RewardKind;
  /** Evento al que aplica el descuento (solo TICKET_DISCOUNT). */
  eventId: string | null;
  title: string;
  description: string | null;
  costNpp: number;
  discountType: RewardDiscountType;
  discountValue: number;
  ownerName: string;
  city: string | null;
  redeemable: boolean;
  limitReached: boolean;
}

export interface AvailableRewardsResponse {
  balance: number;
  rewards: AvailableReward[];
}

export interface Redemption {
  id: string;
  code: string;
  status: 'PENDING' | 'USED' | 'EXPIRED' | 'REVERSED';
  costNpp: number;
  redeemedAt: string;
  usedAt: string | null;
  expiresAt: string;
  reward: {
    title: string;
    kind: RewardKind;
    venue: { name: string } | null;
    promoter: { name: string } | null;
  };
}

export interface RedeemResult {
  id: string;
  code: string;
  title: string;
  kind: RewardKind;
  expiresAt: string;
  costNpp: number;
}

export function useAvailableRewards() {
  return useQuery({
    queryKey: ['rewards-available'],
    queryFn: () => clientFetch<AvailableRewardsResponse>('/api/rewards/available'),
    staleTime: 30_000,
  });
}

export function useMyRedemptions() {
  return useQuery({
    queryKey: ['my-redemptions'],
    queryFn: () => clientFetch<Redemption[]>('/api/me/redemptions'),
    staleTime: 15_000,
  });
}

export function useRedeemReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rewardId: string) =>
      clientFetch<RedeemResult>(`/api/rewards/${rewardId}/redeem`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards-available'] });
      qc.invalidateQueries({ queryKey: ['my-redemptions'] });
      qc.invalidateQueries({ queryKey: ['loyalty', 'status'] });
    },
  });
}

// ── Promos BULK (regalo por comprar N boletos) ────────────────────────────────

export interface BulkOption {
  id: string;
  label: string;
  description: string | null;
}

export interface BulkPendingItem {
  redemptionId: string;
  orderId: string | null;
  code: string;
  expiresAt: string;
  reward: {
    title: string;
    options: BulkOption[];
  };
}

export interface BulkPendingResponse {
  items: BulkPendingItem[];
}

export interface ChooseBulkResult {
  code: string;
  title: string;
  optionLabel: string;
  expiresAt: string;
}

export function useBulkPending() {
  return useQuery({
    queryKey: ['rewards-bulk-pending'],
    queryFn: () => clientFetch<BulkPendingResponse>('/api/rewards/bulk/pending'),
    staleTime: 15_000,
  });
}

export function useChooseBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ redemptionId, optionId }: { redemptionId: string; optionId: string }) =>
      clientFetch<ChooseBulkResult>(`/api/rewards/redemptions/${redemptionId}/choose`, {
        method: 'POST',
        body: { optionId },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards-bulk-pending'] });
      qc.invalidateQueries({ queryKey: ['my-redemptions'] });
    },
  });
}
