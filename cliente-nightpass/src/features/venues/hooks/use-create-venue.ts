'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { Venue } from '@/core/types/api';
import type { VenueInput } from '../schemas/venue.schema';

function readError(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 409) return 'Ya existe un local con ese nombre';
    if (error.status === 400) return 'Datos inválidos';
  }
  return 'No pudimos crear el local';
}

export function useCreateVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VenueInput) => {
      return clientFetch<Venue>('/api/venues', {
        method: 'POST',
        body: input,
      });
    },
    onSuccess: (venue) => {
      toast.success('Local creado exitosamente');
      qc.invalidateQueries({ queryKey: ['venues'] });
    },
    onError: (err) => toast.error(readError(err)),
  });
}
