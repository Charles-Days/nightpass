'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { VenueApplication } from '@/core/types/api';
import { paths } from '@/core/config/paths';

interface RejectInput {
  id: string;
  reason?: string;
}

function readError(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 409) return 'Esta solicitud ya fue procesada';
    if (error.status === 404) return 'La solicitud no existe';
  }
  return 'No pudimos rechazar la solicitud';
}

interface RejectOptions {
  onSuccess?: () => void;
}

export function useRejectApplication(opts?: RejectOptions) {
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ id, reason }: RejectInput) =>
      clientFetch<VenueApplication>(`/api/venue-applications/${id}/reject`, {
        method: 'POST',
        body: { reason: reason?.trim() || undefined },
      }),
    onSuccess: (data) => {
      toast.success(`"${data.venueName}" fue rechazado`);
      qc.invalidateQueries({ queryKey: ['venue-applications'] });
      if (opts?.onSuccess) {
        opts.onSuccess();
        router.refresh();
      } else {
        router.replace(paths.adminApplications);
        router.refresh();
      }
    },
    onError: (err) => toast.error(readError(err)),
  });
}
