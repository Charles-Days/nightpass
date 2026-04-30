'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { Venue } from '@/core/types/api';
import type { UpdateVenueInput } from '../schemas/venue.schema';

function readError(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 404) return 'Local no encontrado';
    if (error.status === 400) return 'Datos inválidos';
  }
  return 'No pudimos actualizar el local';
}

export function useUpdateVenue(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateVenueInput) => {
      return clientFetch<Venue>(`/api/venues/${id}`, {
        method: 'PATCH',
        body: input,
      });
    },
    onSuccess: () => {
      toast.success('Local actualizado');
      qc.invalidateQueries({ queryKey: ['venues'] });
      qc.invalidateQueries({ queryKey: ['venues', id] });
    },
    onError: (err) => toast.error(readError(err)),
  });
}
