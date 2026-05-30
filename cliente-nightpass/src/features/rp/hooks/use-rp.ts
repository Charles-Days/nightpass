'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';

export interface RpProfile {
  id: string;
  userId: string;
  rpCode: string;
  displayName: string;
  isActive: boolean;
  promoterId: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    email: string;
    role: string;
  };
  promoter?: {
    name: string;
  } | null;
}

export interface RpStats {
  rpId: string;
  displayName: string;
  rpCode: string;
  totalSales: number;
  totalEarningsCents: number;
  eventStats: Array<{
    eventId: string;
    eventName: string;
    eventStartsAt: string | null;
    eventEndsAt: string | null;
    eventCoverImageUrl: string | null;
    isPassed: boolean;
    salesCount: number;
    earningsCents: number;
    rule: {
      id: string;
      type: 'PER_N_TICKETS' | 'PERCENTAGE';
      nTickets: number | null;
      rewardCents: number | null;
      percentage: number | null;
    } | null;
  }>;
  sales: Array<{
    id: string;
    createdAt: string;
    eventName: string;
    tierName: string;
    priceCents: number;
    totalCents: number;
  }>;
}

export interface CommissionRule {
  id: string;
  rpProfileId: string;
  eventId: string | null;
  type: 'PER_N_TICKETS' | 'PERCENTAGE';
  nTickets: number | null;
  rewardCents: number | null;
  currency: string;
  percentage: number | null;
  isActive: boolean;
  event?: {
    title: string;
  } | null;
}

export function useRpList(query: { search?: string; promoterId?: string; page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.promoterId) params.set('promoterId', query.promoterId);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const queryString = params.toString() ? `?${params.toString()}` : '';

  return useQuery({
    queryKey: ['rps', query],
    queryFn: () =>
      clientFetch<{ items: RpProfile[]; total: number; page: number; limit: number }>(`/api/rp${queryString}`),
  });
}

export function useRpDetail(id: string | null) {
  return useQuery({
    queryKey: ['rps', 'detail', id],
    queryFn: () => clientFetch<RpProfile>(`/api/rp/${id}`),
    enabled: !!id,
  });
}

export function useRpStats(id: string | null) {
  return useQuery({
    queryKey: ['rps', 'stats', id],
    queryFn: () => clientFetch<RpStats>(`/api/rp/${id}/stats`),
    enabled: !!id,
  });
}

export function useRpMeStats() {
  return useQuery({
    queryKey: ['rp-me', 'stats'],
    queryFn: () => clientFetch<RpStats>('/api/rp/me/stats'),
  });
}

export interface IssuedPass {
  id: string;
  token: string;
  status: 'PENDING' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';
  amountCents: number;
  currency: string;
  expiresAt: string;
  event: { id: string; title: string; startsAt: string };
  tier: { id: string; name: string };
}

// Tiers de un evento (vía catálogo público, con precio vigente).
export function useEventTiers(eventId: string | null) {
  return useQuery({
    queryKey: ['catalog-event-tiers', eventId],
    enabled: !!eventId,
    queryFn: () =>
      clientFetch<{ tiers: Array<{ id: string; name: string; priceCents: number; currency: string }> }>(
        `/api/catalog/events/${eventId}`,
      ),
  });
}

// El RP emite un vale (venta en efectivo) → devuelve el token para pintar el QR.
export function useIssueRpPass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { eventId: string; tierId: string }) =>
      clientFetch<IssuedPass>('/api/rp/passes/issue', { method: 'POST', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rp-me', 'issued'] });
    },
  });
}

export function useCreateRp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; displayName: string; password?: string; promoterId?: string; eventId?: string }) =>
      clientFetch<RpProfile>('/api/rp', {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rps'] });
    },
  });
}

export function useToggleRpActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      clientFetch<RpProfile>(`/api/rp/${id}/toggle-active`, {
        method: 'PATCH',
      }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rps'] });
      queryClient.invalidateQueries({ queryKey: ['rps', 'detail', id] });
    },
  });
}

export function useSetCommissionRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rpId,
      data,
    }: {
      rpId: string;
      data: {
        eventId?: string;
        type: 'PER_N_TICKETS' | 'PERCENTAGE';
        nTickets?: number;
        rewardCents?: number;
        currency?: string;
        percentage?: number;
      };
    }) =>
      clientFetch<CommissionRule>(`/api/rp/${rpId}/commission-rules`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: (_, { rpId }) => {
      queryClient.invalidateQueries({ queryKey: ['rps', 'detail', rpId] });
      queryClient.invalidateQueries({ queryKey: ['rps', 'stats', rpId] });
    },
  });
}

export function useDeleteCommissionRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rpId, ruleId }: { rpId: string; ruleId: string }) =>
      clientFetch<{ ok: boolean }>(`/api/rp/${rpId}/commission-rules/${ruleId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, { rpId }) => {
      queryClient.invalidateQueries({ queryKey: ['rps', 'detail', rpId] });
      queryClient.invalidateQueries({ queryKey: ['rps', 'stats', rpId] });
    },
  });
}
