'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { Promoter } from '@/core/types/api';
import type { AdminUpdatePromoterInput } from '../schemas/admin-promoter.schema';

function readError(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 404) return 'Organizador no encontrado';
    if (error.status === 400) return 'Datos inválidos';
  }
  return 'No pudimos actualizar el organizador';
}

export function useAdminUpdatePromoter(
  id: string,
  opts?: { onSuccess?: () => void },
) {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (input: AdminUpdatePromoterInput) =>
      clientFetch<Promoter>(`/api/promoters/${id}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: () => {
      toast.success('Organizador actualizado');
      qc.invalidateQueries({ queryKey: ['promoters'] });
      router.refresh();
      opts?.onSuccess?.();
    },
    onError: (err) => toast.error(readError(err)),
  });
}
