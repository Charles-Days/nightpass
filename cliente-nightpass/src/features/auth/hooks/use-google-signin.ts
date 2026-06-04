'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import { paths } from '@/core/config/paths';
import { saveRpRef, extractRefFromPath } from '@/features/rp-referral/rp-referral';
import { safeRedirectPath } from '@/core/lib/safe-redirect';
import type { User } from '@/core/types/api';
import { sessionQueryKey } from './use-session';

interface GoogleLoginResponse {
  user: User;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 503) return 'Google sign-in no está configurado todavía';
    if (error.status === 401) return 'Token de Google inválido';
    if (error.status === 429) return 'Demasiados intentos, espera un momento';
    if (error.status >= 500) return 'El servidor no está respondiendo';
    const payload = error.payload as { message?: string | string[] } | null;
    const message = payload?.message;
    if (Array.isArray(message)) return message[0] ?? 'Error con Google';
    if (typeof message === 'string') return message;
  }
  return 'No pudimos conectar con el servidor';
}

export function useGoogleSignin() {
  const qc = useQueryClient();
  const params = useSearchParams();

  return useMutation({
    mutationFn: (idToken: string) =>
      clientFetch<GoogleLoginResponse>('/api/auth/google', {
        method: 'POST',
        body: { idToken },
      }),
    onSuccess: (data) => {
      qc.setQueryData(sessionQueryKey, data.user);
      toast.success(`Hola${data.user.name ? `, ${data.user.name}` : ''}`);
      const from = params.get('from');
      const safeFrom = safeRedirectPath(from, '') || null;
      // Preserva el código RP anidado en `from` antes del reload.
      const ref = extractRefFromPath(safeFrom);
      if (ref) saveRpRef(ref);
      const fallback = data.user.role === 'CUSTOMER' ? paths.appHome : paths.dashboard;
      // Navegación dura — ver nota en use-customer-login.
      window.location.assign(safeFrom ?? fallback);
    },
    onError: (error) => {
      toast.error(readErrorMessage(error));
    },
  });
}
