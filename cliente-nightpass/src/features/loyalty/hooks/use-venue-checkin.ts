'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clientFetch, ClientApiError } from '@/core/lib/api/client-client';
import type { VenueCheckinResponse } from '@/core/types/api';

export interface VenueCheckinInput {
  venueId: string;
  qrPayload: string;
  latitude: number;
  longitude: number;
}

function extractMessage(payload: unknown): string | null {
  if (typeof payload === 'object' && payload !== null) {
    const m = (payload as Record<string, unknown>).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m) && m.length > 0) return String(m[0]);
  }
  return null;
}

export function useVenueCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VenueCheckinInput) =>
      clientFetch<VenueCheckinResponse>('/api/loyalty/checkin', {
        method: 'POST',
        body: input,
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['loyalty', 'status'] });
      qc.invalidateQueries({ queryKey: ['loyalty', 'history'] });
      if (data.alreadyCheckedInToday) {
        toast.info('Ya hiciste check-in hoy aquí — vuelve mañana.');
      }
    },
    onError: (err) => {
      const msg =
        err instanceof ClientApiError
          ? extractMessage(err.payload) ?? 'No pudimos validar tu check-in'
          : 'No pudimos validar tu check-in';
      toast.error(msg);
    },
  });
}
