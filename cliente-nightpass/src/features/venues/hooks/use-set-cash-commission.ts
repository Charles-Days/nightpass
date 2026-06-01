'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { clientFetch } from '@/core/lib/api/client-client';
import type { Venue } from '@/core/types/api';

export function useSetVenueCashCommission(id: string) {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    // exempt=true → NightPass NO cobra comisión en efectivo (sin wallet).
    mutationFn: (exempt: boolean) =>
      clientFetch<Venue>(`/api/venues/${id}/cash-commission`, {
        method: 'POST',
        body: { exempt },
      }),
    onSuccess: () => {
      toast.success('Comisión en efectivo actualizada');
      qc.invalidateQueries({ queryKey: ['venues'] });
      qc.invalidateQueries({ queryKey: ['venues', id] });
      router.refresh();
    },
    onError: () => toast.error('No pudimos actualizar la comisión en efectivo'),
  });
}
