'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { ApproveResponse } from '@/core/types/api';

function readError(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 409) return 'Esta solicitud ya fue procesada';
    if (error.status === 404) return 'La solicitud no existe';
  }
  return 'No pudimos aprobar la solicitud';
}

interface ApproveOptions {
  onSuccess?: (data: ApproveResponse) => void;
}

export function useApproveApplication(opts?: ApproveOptions) {
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (id: string) =>
      clientFetch<ApproveResponse>(`/api/venue-applications/${id}/approve`, { method: 'POST' }),
    onSuccess: (data) => {
      toast.success(`"${data.venueName}" fue aprobado`);
      qc.invalidateQueries({ queryKey: ['venue-applications'] });
      router.refresh();
      opts?.onSuccess?.(data);
    },
    onError: (err) => toast.error(readError(err)),
  });
}
