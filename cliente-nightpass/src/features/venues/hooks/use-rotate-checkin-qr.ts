'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clientFetch, ClientApiError } from '@/core/lib/api/client-client';
import type { VenueCheckinQrPayload } from '@/core/types/api';

function extractMessage(payload: unknown): string | null {
  if (typeof payload === 'object' && payload !== null) {
    const m = (payload as Record<string, unknown>).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m) && m.length > 0) return String(m[0]);
  }
  return null;
}

export function useRotateCheckinQr(venueId: string) {
  return useMutation({
    mutationFn: () =>
      clientFetch<VenueCheckinQrPayload>(
        `/api/venues/${venueId}/checkin-qr/rotate`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      toast.success('QR de check-in generado');
    },
    onError: (err) => {
      const msg =
        err instanceof ClientApiError
          ? extractMessage(err.payload) ?? 'No pudimos generar el QR'
          : 'No pudimos generar el QR';
      toast.error(msg);
    },
  });
}
