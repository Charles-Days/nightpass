'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clientFetch } from '@/core/lib/api/client-client';

export function useDeleteTier(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tierId: string) =>
      clientFetch<void>(`/api/events/${eventId}/tiers/${tierId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success('Tier eliminado');
      qc.invalidateQueries({ queryKey: ['event-detail', eventId] });
    },
    onError: () => toast.error('No pudimos eliminar el tier'),
  });
}
