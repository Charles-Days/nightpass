'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { clientFetch } from '@/core/lib/api/client-client';
import { paths } from '@/core/config/paths';

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => clientFetch<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.clear();
      toast.success('Sesion cerrada');
      router.replace(paths.login);
      router.refresh();
    },
    onError: () => {
      toast.error('No se pudo cerrar la sesion');
    },
  });
}
