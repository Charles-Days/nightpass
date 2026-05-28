'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';

interface InvitePromoterStaffInput {
  email: string;
  name: string;
}

interface InvitePromoterStaffResponse {
  userId: string;
  temporaryPassword?: string;
}

function readError(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 404) return 'Organizador no encontrado';
    if (error.status === 409) return 'Esta persona ya es staff de tu equipo';
  }
  return 'No pudimos enviar la invitación';
}

export function useInvitePromoterStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InvitePromoterStaffInput) =>
      clientFetch<InvitePromoterStaffResponse>('/api/promoters/me/staff', {
        method: 'POST',
        body: input,
      }),
    onSuccess: (data) => {
      toast.success('Invitación enviada');
      if (data.temporaryPassword) {
        toast.success(`Password temporal: ${data.temporaryPassword}`, { duration: 10000 });
      }
      qc.invalidateQueries({ queryKey: ['promoter-staff'] });
    },
    onError: (err) => toast.error(readError(err)),
  });
}
