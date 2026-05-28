'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { PromoterApplication } from '@/core/types/api';

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

export function useRejectPromoterApplication(opts?: RejectOptions) {
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ id, reason }: RejectInput) =>
      clientFetch<PromoterApplication>(`/api/promoter-applications/${id}/reject`, {
        method: 'POST',
        body: { reason: reason?.trim() || undefined },
      }),
    onSuccess: (data) => {
      toast.success(`"${data.promoterName}" fue rechazada`);
      qc.invalidateQueries({ queryKey: ['promoter-applications'] });
      router.refresh();
      opts?.onSuccess?.();
    },
    onError: (err) => toast.error(readError(err)),
  });
}
