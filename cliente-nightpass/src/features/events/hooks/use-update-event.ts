'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clientFetch } from '@/core/lib/api/client-client';
import type { Event } from '@/core/types/api';

export function useUpdateEvent(venueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Event> & { id: string }) =>
      clientFetch<Event>(`/api/events/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      toast.success('Evento actualizado');
      qc.invalidateQueries({ queryKey: ['events', venueId] });
    },
    onError: () => toast.error('No pudimos actualizar el evento'),
  });
}
