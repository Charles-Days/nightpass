'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';

function readError(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 409)
      return 'No puedes eliminar un organizador con eventos. Suspéndelo en su lugar.';
    if (error.status === 404) return 'Organizador no encontrado';
  }
  return 'No pudimos eliminar el organizador';
}

export function useDeletePromoter(opts?: { onSuccess?: () => void }) {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (id: string) =>
      clientFetch<{ ok: true }>(`/api/promoters/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Organizador eliminado');
      qc.invalidateQueries({ queryKey: ['promoters'] });
      router.refresh();
      opts?.onSuccess?.();
    },
    onError: (err) => toast.error(readError(err)),
  });
}
