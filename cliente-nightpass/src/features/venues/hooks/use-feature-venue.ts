'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { clientFetch } from '@/core/lib/api/client-client';
import type { Venue } from '@/core/types/api';

export interface FeatureVenueInput {
  featured: boolean;
  reason?: string;
}

export function useFeatureVenue(id: string) {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (input: FeatureVenueInput) =>
      clientFetch<Venue>(
        `/api/venues/${id}/${input.featured ? 'feature' : 'unfeature'}`,
        {
          method: 'POST',
          body: input.featured ? { reason: input.reason } : undefined,
        },
      ),
    onSuccess: (_data, input) => {
      toast.success(input.featured ? 'Destacado en primera plana' : 'Removido de destacados');
      qc.invalidateQueries({ queryKey: ['venues'] });
      qc.invalidateQueries({ queryKey: ['venues', id] });
      router.refresh();
    },
    onError: () => toast.error('No pudimos actualizar el destacado'),
  });
}
