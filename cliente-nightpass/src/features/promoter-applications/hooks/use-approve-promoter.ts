'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { ApprovePromoterResponse } from '@/core/types/api';

function readError(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 409) return 'Esta solicitud ya fue procesada';
    if (error.status === 404) return 'La solicitud no existe';
  }
  return 'No pudimos aprobar la solicitud';
}

interface ApproveOptions {
  onSuccess?: (data: ApprovePromoterResponse) => void;
}

export function useApprovePromoterApplication(opts?: ApproveOptions) {
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (id: string) =>
      clientFetch<ApprovePromoterResponse>(`/api/promoter-applications/${id}/approve`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      toast.success(`"${data.promoterName}" fue aprobada`);
      qc.invalidateQueries({ queryKey: ['promoter-applications'] });
      router.refresh();
      opts?.onSuccess?.(data);
    },
    onError: (err) => toast.error(readError(err)),
  });
}
