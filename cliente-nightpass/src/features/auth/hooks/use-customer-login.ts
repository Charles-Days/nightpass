'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import { paths } from '@/core/config/paths';
import type { User } from '@/core/types/api';
import type { LoginInput } from '../schemas/login.schema';
import { sessionQueryKey } from './use-session';

interface LoginResponse {
  user: User;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 401) return 'Email o contraseña incorrectos';
    if (error.status === 429) return 'Demasiados intentos, espera un momento';
    if (error.status >= 500) return 'El servidor no está respondiendo';
    const payload = error.payload as { message?: string | string[] } | null;
    const message = payload?.message;
    if (Array.isArray(message)) return message[0] ?? 'Error al iniciar sesión';
    if (typeof message === 'string') return message;
  }
  return 'No pudimos conectar con el servidor';
}

export function useCustomerLogin() {
  const qc = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();

  return useMutation({
    mutationFn: (input: LoginInput) =>
      clientFetch<LoginResponse>('/api/auth/customer-login', { method: 'POST', body: input }),
    onSuccess: (data) => {
      qc.setQueryData(sessionQueryKey, data.user);
      toast.success(`Hola${data.user.name ? `, ${data.user.name}` : ''}`);
      const from = params.get('from');
      const safeFrom = from && from.startsWith('/') ? from : null;
      const fallback = data.user.role === 'CUSTOMER' ? paths.home : paths.dashboard;
      router.replace((safeFrom ?? fallback) as never);
      router.refresh();
    },
    onError: (error) => {
      toast.error(readErrorMessage(error));
    },
  });
}
