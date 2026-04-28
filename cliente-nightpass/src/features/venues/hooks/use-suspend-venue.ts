'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { Venue } from '@/core/types/api';

function readError(error: unknown): string {
  if (error instanceof ClientApiError && error.status === 404) {
    return 'Local no encontrado';
  }
  return 'No pudimos suspender el local';
}

export function useSuspendVenue(id: string) {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => clientFetch<Venue>(`/api/venues/${id}/suspend`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Local suspendido');
      qc.invalidateQueries({ queryKey: ['venues'] });
      qc.invalidateQueries({ queryKey: ['venues', id] });
      router.refresh();
    },
    onError: (err) => toast.error(readError(err)),
  });
}
