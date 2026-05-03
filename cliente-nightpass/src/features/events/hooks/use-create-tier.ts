'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clientFetch, ClientApiError } from '@/core/lib/api/client-client';
import type { EventTier } from '@/core/types/api';

export interface CreateTierInput {
  name: string;
  priceCents: number;
  currency?: string;
  capacity?: number;
  position?: number;
}

export function useCreateTier(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTierInput) =>
      clientFetch<EventTier>(`/api/events/${eventId}/tiers`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      toast.success('Tier creado');
      qc.invalidateQueries({ queryKey: ['event-detail', eventId] });
    },
    onError: (err) => {
      const msg =
        err instanceof ClientApiError && extractMessage(err.payload)
          ? extractMessage(err.payload)
          : 'No pudimos crear el tier';
      toast.error(msg ?? 'Error');
    },
  });
}

function extractMessage(payload: unknown): string | null {
  if (typeof payload === 'object' && payload !== null) {
    const m = (payload as Record<string, unknown>).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m) && m.length > 0) return String(m[0]);
  }
  return null;
}
