'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

const checkinQrKey = (venueId: string) => ['venue-checkin-qr', venueId] as const;

/** Read the persisted QR for this venue. Returns null if never generated. */
export function useCheckinQr(venueId: string) {
  return useQuery({
    queryKey: checkinQrKey(venueId),
    queryFn: () =>
      clientFetch<VenueCheckinQrPayload | null>(
        `/api/venues/${venueId}/checkin-qr`,
      ),
    staleTime: 5 * 60_000,
  });
}

export function useRotateCheckinQr(venueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      clientFetch<VenueCheckinQrPayload>(
        `/api/venues/${venueId}/checkin-qr/rotate`,
        { method: 'POST' },
      ),
    onSuccess: (data) => {
      qc.setQueryData(checkinQrKey(venueId), data);
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
