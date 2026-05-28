'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { clientFetch } from '@/core/lib/api/client-client';
import type { Event } from '@/core/types/api';

export interface FeatureEventInput {
  featured: boolean;
  reason?: string;
}

export function useFeatureEvent(id: string) {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (input: FeatureEventInput) =>
      clientFetch<Event>(
        `/api/events/${id}/${input.featured ? 'feature' : 'unfeature'}`,
        {
          method: 'POST',
          body: input.featured ? { reason: input.reason } : undefined,
        },
      ),
    onSuccess: (_data, input) => {
      toast.success(input.featured ? 'Evento destacado' : 'Removido de destacados');
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['event-detail', id] });
      router.refresh();
    },
    onError: () => toast.error('No pudimos actualizar el destacado'),
  });
}
