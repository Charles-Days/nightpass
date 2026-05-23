'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { ForgotPasswordInput } from '../schemas/forgot-password.schema';

function readErrorMessage(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 429) return 'Demasiadas solicitudes, intenta más tarde';
    if (error.status >= 500) return 'El servidor no está respondiendo';
    const payload = error.payload as { message?: string | string[] } | null;
    const message = payload?.message;
    if (Array.isArray(message)) return message[0] ?? 'Error al enviar';
    if (typeof message === 'string') return message;
  }
  return 'No pudimos conectar con el backend';
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) =>
      clientFetch<{ ok: true }>('/api/auth/forgot-password', { method: 'POST', body: input }),
    onError: (error) => {
      toast.error(readErrorMessage(error));
    },
  });
}
