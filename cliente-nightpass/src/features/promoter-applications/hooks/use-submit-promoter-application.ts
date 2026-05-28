'use client';

import { useMutation } from '@tanstack/react-query';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { PromoterApplicationInput } from '../schemas/promoter-application.schema';

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
      return 'Ya tienes una solicitud pendiente para esta promotora.';
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

export function useSubmitPromoterApplication() {
  return useMutation({
    mutationFn: (input: PromoterApplicationInput) => {
      const cleaned: PromoterApplicationInput = {
        applicant: input.applicant,
        promoter: {
          name: input.promoter.name,
          city: input.promoter.city,
          phone: input.promoter.phone || undefined,
          instagram: input.promoter.instagram || undefined,
          website: input.promoter.website || undefined,
          experience: input.promoter.experience,
          eventTypes: input.promoter.eventTypes,
          message: input.promoter.message || undefined,
        },
      };
      return clientFetch<SubmitResponse>('/api/promoter-applications', {
        method: 'POST',
        body: cleaned,
      });
    },
  });
}
