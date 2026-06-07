'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';

export type RewardKind = 'VENUE_PERK' | 'TICKET_DISCOUNT';
export type RewardDiscountType = 'NONE' | 'PERCENT' | 'FIXED';

export interface AvailableReward {
  id: string;
  kind: RewardKind;
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
