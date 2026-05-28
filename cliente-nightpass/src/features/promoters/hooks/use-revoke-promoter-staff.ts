'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clientFetch } from '@/core/lib/api/client-client';

export function useRevokePromoterStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      clientFetch<{ ok: boolean }>(`/api/promoters/me/staff/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Staff revocado');
      qc.invalidateQueries({ queryKey: ['promoter-staff'] });
    },
    onError: () => toast.error('No pudimos revocar el acceso'),
  });
}
