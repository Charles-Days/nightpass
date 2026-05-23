'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import { paths } from '@/core/config/paths';

interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

interface UseResetPasswordOptions {
  variant?: 'admin' | 'customer';
}

function readErrorMessage(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 401) return 'El link expiró o ya fue usado. Solicita uno nuevo.';
    if (error.status === 429) return 'Demasiados intentos, espera un momento';
    if (error.status >= 500) return 'El servidor no está respondiendo';
    const payload = error.payload as { message?: string | string[] } | null;
    const message = payload?.message;
    if (Array.isArray(message)) return message[0] ?? 'Error al cambiar contraseña';
    if (typeof message === 'string') return message;
  }
  return 'No pudimos conectar con el backend';
}

export function useResetPassword(options: UseResetPasswordOptions = {}) {
  const router = useRouter();
  const redirectTo = options.variant === 'customer' ? paths.iniciarSesion : paths.login;

  return useMutation({
    mutationFn: (input: ResetPasswordPayload) =>
      clientFetch<{ ok: true }>('/api/auth/reset-password', { method: 'POST', body: input }),
    onSuccess: () => {
      toast.success('Contraseña actualizada. Inicia sesión con la nueva.');
      router.replace(redirectTo);
    },
    onError: (error) => {
      toast.error(readErrorMessage(error));
    },
  });
}
