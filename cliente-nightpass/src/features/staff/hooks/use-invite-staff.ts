'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { VenueStaffRole } from '@/core/types/api';

interface InviteStaffInput {
  email: string;
  name: string;
  staffRole?: VenueStaffRole;
}

interface InviteStaffResponse {
  userId: string;
  temporaryPassword?: string;
}

function readError(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 404) return 'Local no encontrado';
    if (error.status === 409) return 'Esta persona ya es staff de este local';
  }
  return 'No pudimos enviar la invitación';
}

export function useInviteStaff(venueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteStaffInput) =>
      clientFetch<InviteStaffResponse>(`/api/venues/${venueId}/staff`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: (data) => {
      toast.success('Invitación enviada');
      if (data.temporaryPassword) {
        toast.success(`Password temporal: ${data.temporaryPassword}`, { duration: 10000 });
      }
      qc.invalidateQueries({ queryKey: ['venue-staff', venueId] });
    },
    onError: (err) => toast.error(readError(err)),
  });
}
