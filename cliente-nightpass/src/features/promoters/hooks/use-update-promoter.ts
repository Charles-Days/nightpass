'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { Promoter } from '@/core/types/api';
import type { UpdatePromoterInput } from '../schemas/promoter.schema';

function readError(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 404) return 'Promotora no encontrada';
    if (error.status === 400) return 'Datos inválidos';
  }
  return 'No pudimos actualizar la promotora';
}

export function useUpdatePromoter() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (input: UpdatePromoterInput) =>
      clientFetch<Promoter>('/api/promoters/me', { method: 'PATCH', body: input }),
    onSuccess: () => {
      toast.success('Promotora actualizada');
      qc.invalidateQueries({ queryKey: ['promoter-me'] });
      router.refresh();
    },
    onError: (err) => toast.error(readError(err)),
  });
}
