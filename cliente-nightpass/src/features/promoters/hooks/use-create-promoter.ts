'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { CreatePromoterResponse } from '@/core/types/api';
import type { CreatePromoterInput } from '../schemas/admin-promoter.schema';

function readError(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 409) return 'Ese email ya tiene una cuenta de panel';
    if (error.status === 400) return 'Datos inválidos';
  }
  return 'No pudimos crear el organizador';
}

export function useCreatePromoter(opts?: {
  onSuccess?: (data: CreatePromoterResponse) => void;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (input: CreatePromoterInput) =>
      clientFetch<CreatePromoterResponse>('/api/promoters', {
        method: 'POST',
        body: input,
      }),
    onSuccess: (data) => {
      toast.success(`Organizador "${data.promoter.name}" creado`);
      qc.invalidateQueries({ queryKey: ['promoters'] });
      router.refresh();
      opts?.onSuccess?.(data);
    },
    onError: (err) => toast.error(readError(err)),
  });
}
