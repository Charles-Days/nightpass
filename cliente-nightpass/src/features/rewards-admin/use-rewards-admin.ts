'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { EventTier, PaginatedEvents } from '@/core/types/api';

export type RewardKind =
  | 'VENUE_PERK'
  | 'TICKET_DISCOUNT'
  | 'BULK_PROMO'
  | 'PHYSICAL_BONUS_NPP'
  | 'PURCHASE_PERK';

export interface RewardOption {
  id: string;
  label: string;
  description: string | null;
  position: number;
}

export interface OwnerReward {
  id: string;
  venueId: string | null;
  promoterId: string | null;
  kind: RewardKind;
  title: string;
  description: string | null;
  costNpp: number;
  discountType: 'NONE' | 'PERCENT' | 'FIXED';
  discountValue: number;
  active: boolean;
  perUserLimit: number | null;
  expiresInH: number;
  eventId: string | null;
  tierId: string | null;
  minQuantity: number | null;
  bonusNpp: number | null;
  options: RewardOption[];
  imageUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  event: { id: string; title: string } | null;
}

export interface CreateRewardBody {
  venueId?: string;
  promoterId?: string;
  kind: RewardKind;
  title: string;
  description?: string;
  costNpp: number;
  discountType?: 'NONE' | 'PERCENT' | 'FIXED';
  discountValue?: number;
  perUserLimit?: number;
  expiresInH?: number;
  active?: boolean;
  eventId?: string;
  tierId?: string;
  minQuantity?: number;
  bonusNpp?: number;
  options?: { label: string; description?: string }[];
  imageUrl?: string;
  startsAt?: string;
  endsAt?: string;
}

// PATCH /rewards/:id — el dueño, el kind y el evento no se editan tras crear.
// imageUrl/startsAt/endsAt aceptan null para limpiar el campo.
export interface UpdateRewardBody {
  title?: string;
  description?: string;
  costNpp?: number;
  discountType?: 'NONE' | 'PERCENT' | 'FIXED';
  discountValue?: number;
  perUserLimit?: number;
  expiresInH?: number;
  active?: boolean;
  options?: { label: string; description?: string }[];
  minQuantity?: number;
  bonusNpp?: number;
  imageUrl?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface ValidateResult {
  ok: boolean;
  title: string;
  customer: string;
  eventTitle: string | null;
  eventStartsAt: string | null;
  optionLabel: string | null;
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
    mutationFn: ({ id, body }: { id: string; body: UpdateRewardBody }) =>
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

export interface RewardEventOption {
  id: string;
  title: string;
}

/**
 * Eventos del dueño para los selects de BULK_PROMO / PHYSICAL_BONUS_NPP.
 * Venue: filtra por `?venueId=`. Organizador: filtra por `?promoterId=`.
 * Ambos ids se pasan explícitos para que ADMIN pueda gestionar cualquier
 * dueño (el backend acepta ambos filtros para ADMIN/OWNER/PROMOTER).
 */
export function useRewardEvents(venueId?: string, promoterId?: string) {
  const qs = venueId
    ? `?venueId=${venueId}&limit=100`
    : promoterId
      ? `?promoterId=${promoterId}&limit=100`
      : '?limit=100';
  return useQuery({
    queryKey: ['reward-events', venueId ?? null, promoterId ?? null],
    enabled: !!(venueId || promoterId),
    queryFn: async () => {
      const res = await clientFetch<PaginatedEvents>(`/api/events${qs}`);
      return res.items.map((e): RewardEventOption => ({ id: e.id, title: e.title }));
    },
  });
}

/** Tiers de un evento concreto (lazy: solo cuando hay eventId seleccionado). */
export function useRewardEventTiers(eventId?: string) {
  return useQuery({
    queryKey: ['reward-event-tiers', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const res = await clientFetch<{ tiers?: EventTier[] }>(`/api/events/${eventId}`);
      return res.tiers ?? [];
    },
  });
}
