'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clientFetch } from '@/core/lib/api/client-client';

export function useDeleteEvent(venueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientFetch<{ ok: boolean }>(`/api/events/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Evento eliminado');
      qc.invalidateQueries({ queryKey: ['events', venueId] });
    },
    onError: () => toast.error('No pudimos eliminar el evento'),
  });
}
