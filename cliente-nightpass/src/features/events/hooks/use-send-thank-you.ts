'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';

interface SendThankYouVars {
  eventId: string;
  orderId: string;
}

interface SendThankYouResult {
  status: string;
  email: string;
}

export function useSendThankYou() {
  return useMutation({
    mutationFn: ({ eventId, orderId }: SendThankYouVars) =>
      clientFetch<SendThankYouResult>(`/api/events/${eventId}/orders/${orderId}/thank-you`, {
        method: 'POST',
      }),
    onSuccess: (data) => toast.success(`Correo de agradecimiento enviado a ${data.email}`),
    onError: (err) => {
      if (err instanceof ClientApiError && err.status === 404) {
        toast.error('Orden no encontrada');
        return;
      }
      if (err instanceof ClientApiError && err.status === 409) {
        toast.error('La orden no está completada');
        return;
      }
      toast.error('No pudimos enviar el correo');
    },
  });
}
