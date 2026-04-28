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
    if (error.status === 401) return 'Email o contrasena incorrectos';
    if (error.status === 403) return 'Esta cuenta es solo para la app movil de NightPass';
    if (error.status === 429) return 'Demasiados intentos, espera un momento';
    if (error.status >= 500) return 'El servidor no esta respondiendo';

    const payload = error.payload as { message?: string | string[] } | null;
    const message = payload?.message;
    if (Array.isArray(message)) return message[0] ?? 'Error al iniciar sesion';
    if (typeof message === 'string') return message;
  }
  return 'No pudimos conectar con el backend';
}

export function useLogin() {
  const qc = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();

  return useMutation({
    mutationFn: (input: LoginInput) =>
      clientFetch<LoginResponse>('/api/auth/login', { method: 'POST', body: input }),
    onSuccess: (data) => {
      qc.setQueryData(sessionQueryKey, data.user);
      toast.success(`Bienvenido${data.user.name ? `, ${data.user.name}` : ''}`);
      const from = params.get('from');
      router.replace(from && from.startsWith('/') ? (from as never) : paths.dashboard);
      router.refresh();
    },
    onError: (error) => {
      toast.error(readErrorMessage(error));
    },
  });
}
