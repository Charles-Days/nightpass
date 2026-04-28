'use client';

import { useMutation } from '@tanstack/react-query';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { ApplicationInput } from '../schemas/application.schema';

interface SubmitResponse {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export function readSubmitErrorMessage(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 409) {
      const payload = error.payload as { message?: string | string[] } | null;
      const m = payload?.message;
      if (Array.isArray(m)) return m[0] ?? 'Solicitud duplicada';
      if (typeof m === 'string') return m;
      return 'Ya tienes una solicitud pendiente para este local.';
    }
    if (error.status === 400) {
      const payload = error.payload as { message?: string | string[] } | null;
      const m = payload?.message;
      if (Array.isArray(m)) return m[0] ?? 'Datos inválidos';
      if (typeof m === 'string') return m;
      return 'Datos inválidos';
    }
    if (error.status === 429) return 'Demasiadas solicitudes, intenta más tarde.';
    if (error.status >= 500) return 'El servidor no está respondiendo';
  }
  return 'No pudimos enviar la solicitud';
}

export function useSubmitApplication() {
  return useMutation({
    mutationFn: (input: ApplicationInput) => {
      const cleaned: ApplicationInput = {
        applicant: input.applicant,
        venue: {
          name: input.venue.name,
          city: input.venue.city,
          address: input.venue.address || undefined,
          phone: input.venue.phone || undefined,
          message: input.venue.message || undefined,
        },
      };
      return clientFetch<SubmitResponse>('/api/venue-applications', {
        method: 'POST',
        body: cleaned,
      });
    },
  });
}
