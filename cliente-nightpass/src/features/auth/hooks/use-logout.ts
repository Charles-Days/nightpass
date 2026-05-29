'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clientFetch } from '@/core/lib/api/client-client';
import { paths } from '@/core/config/paths';

export function useLogout(options?: { redirectTo?: string }) {
  const qc = useQueryClient();
  const redirectTo = options?.redirectTo ?? paths.login;

  return useMutation({
    mutationFn: () => clientFetch<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.clear();
      toast.success('Sesion cerrada');
      // Navegación dura: re-corre el middleware sin la cookie y aterriza en login.
      window.location.assign(redirectTo);
    },
    onError: () => {
      toast.error('No se pudo cerrar la sesion');
    },
  });
}
