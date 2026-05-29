'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import { paths } from '@/core/config/paths';
import { saveRpRef, extractRefFromPath } from '@/features/rp-referral/rp-referral';
import type { User } from '@/core/types/api';
import type { SignupInput } from '../schemas/signup.schema';
import { sessionQueryKey } from './use-session';

interface SignupResponse {
  user: User;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 409) return 'Este email ya está registrado';
    if (error.status === 429) return 'Demasiados intentos, espera un momento';
    if (error.status >= 500) return 'El servidor no está respondiendo';
    const payload = error.payload as { message?: string | string[] } | null;
    const message = payload?.message;
    if (Array.isArray(message)) return message[0] ?? 'Error al crear la cuenta';
    if (typeof message === 'string') return message;
  }
  return 'No pudimos conectar con el servidor';
}

export function useCustomerSignup() {
  const qc = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();

  return useMutation({
    mutationFn: (input: SignupInput) =>
      clientFetch<SignupResponse>('/api/auth/customer-signup', { method: 'POST', body: input }),
    onSuccess: (data) => {
      qc.setQueryData(sessionQueryKey, data.user);
      toast.success(`Bienvenido a NightPass, ${data.user.name ?? ''}`);
      const from = params.get('from');
      const safeFrom = from && from.startsWith('/') ? from : null;
      // Preserva el código RP anidado en `from` antes del reload del registro.
      const ref = extractRefFromPath(safeFrom);
      if (ref) saveRpRef(ref);
      router.replace((safeFrom ?? paths.appHome) as never);
      router.refresh();
    },
    onError: (error) => {
      toast.error(readErrorMessage(error));
    },
  });
}
