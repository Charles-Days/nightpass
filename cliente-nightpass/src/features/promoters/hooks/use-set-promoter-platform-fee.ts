'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { clientFetch } from '@/core/lib/api/client-client';
import type { Promoter } from '@/core/types/api';

export function useSetPromoterPlatformFee(id: string) {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (platformFeePct: number | null) =>
      clientFetch<Promoter>(`/api/promoters/${id}/platform-fee`, {
        method: 'POST',
        body: { platformFeePct },
      }),
    onSuccess: () => {
      toast.success('Comisión NightPass actualizada');
      qc.invalidateQueries({ queryKey: ['promoters'] });
      qc.invalidateQueries({ queryKey: ['promoters', id] });
      router.refresh();
    },
    onError: () => toast.error('No pudimos actualizar la comisión'),
  });
}
