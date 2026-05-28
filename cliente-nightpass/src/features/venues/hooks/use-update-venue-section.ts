'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { Venue } from '@/core/types/api';
import type { VenueInput } from '../schemas/venue.schema';

// Backend DTOs usan @IsOptional + validadores estrictos. Empty string,
// NaN y null fallan IsNumber/IsUrl. Mejor omitir los campos vacíos antes
// de mandar el PATCH para no disparar 400s.
const NUMERIC_FIELDS = ['latitude', 'longitude', 'capacity', 'priceFromCents', 'minAge'] as const;
const STRING_FIELDS = [
  'address', 'phone', 'description', 'currency', 'coverImageUrl',
  'menuUrl', 'dressCode', 'googleMapsUrl',
] as const;

function sanitizePartial(partial: Partial<VenueInput>): Partial<VenueInput> {
  const out: Record<string, unknown> = { ...partial };
  for (const key of NUMERIC_FIELDS) {
    const v = out[key];
    if (v === '' || v === null || (typeof v === 'number' && Number.isNaN(v))) {
      delete out[key];
    }
  }
  for (const key of STRING_FIELDS) {
    if (out[key] === '' || out[key] === null) delete out[key];
  }
  return out as Partial<VenueInput>;
}

function extractMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as { message?: string | string[] };
  if (!p.message) return null;
  return Array.isArray(p.message) ? p.message[0] : p.message;
}

export function useUpdateVenueSection(venueId: string) {
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (partial: Partial<VenueInput>) =>
      clientFetch<Venue>(`/api/venues/${venueId}`, {
        method: 'PATCH',
        body: sanitizePartial(partial),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['venues'] });
      qc.invalidateQueries({ queryKey: ['venue', venueId] });
      router.refresh();
      toast.success('Sección guardada');
    },
    onError: (err) => {
      const msg =
        err instanceof ClientApiError
          ? (extractMessage(err.payload) ?? 'No se pudo guardar')
          : 'No se pudo guardar';
      toast.error(msg);
    },
  });
}
