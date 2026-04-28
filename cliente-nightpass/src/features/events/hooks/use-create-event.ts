'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clientFetch } from '@/core/lib/api/client-client';
import type { Event } from '@/core/types/api';

export function useCreateEvent(venueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Event> & { venueId: string; title: string; startsAt: string; endsAt: string }) =>
      clientFetch<Event>('/api/events', { method: 'POST', body: input }),
    onSuccess: () => {
      toast.success('Evento creado');
      qc.invalidateQueries({ queryKey: ['events', venueId] });
    },
    onError: () => toast.error('No pudimos crear el evento'),
  });
}
