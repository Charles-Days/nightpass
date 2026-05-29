'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clientFetch, ClientApiError } from '@/core/lib/api/client-client';

export function useDeleteEvent(venueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientFetch<{ ok: boolean }>(`/api/events/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Evento eliminado');
      qc.invalidateQueries({ queryKey: ['events', venueId] });
    },
    onError: (err) => {
      // El backend devuelve 409 con motivo (ej. pases vendidos) — mostrarlo.
      const msg =
        err instanceof ClientApiError && extractMessage(err.payload)
          ? extractMessage(err.payload)
          : 'No pudimos eliminar el evento';
      toast.error(msg ?? 'No pudimos eliminar el evento');
    },
  });
}

function extractMessage(payload: unknown): string | null {
  if (typeof payload === 'object' && payload !== null) {
    const m = (payload as Record<string, unknown>).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m) && m.length > 0) return String(m[0]);
  }
  return null;
}
