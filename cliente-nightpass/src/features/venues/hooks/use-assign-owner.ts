'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';

export interface AssignOwnerInput {
  email: string;
  name?: string;
}

export interface AssignOwnerResponse {
  userId: string;
  email: string;
  name: string | null;
  isNewUser: boolean;
  wasPromoted: boolean;
  temporaryPassword: string | null;
}

function readError(err: unknown): string {
  if (err instanceof ClientApiError) {
    const body = err.payload as { message?: string | string[] } | null;
    if (body?.message) {
      return Array.isArray(body.message) ? body.message[0] : body.message;
    }
    if (err.status === 409) return 'Este usuario ya está asignado o es ADMIN';
    if (err.status === 400) return 'Datos inválidos';
  }
  return 'No pudimos asignar el dueño';
}

export function useAssignOwner(venueId: string) {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (input: AssignOwnerInput) =>
      clientFetch<AssignOwnerResponse>(`/api/venues/${venueId}/owners`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: (data) => {
      if (data.isNewUser) {
        toast.success(`Cuenta creada para ${data.email}. Credenciales enviadas por correo.`);
      } else if (data.wasPromoted) {
        toast.success(`${data.email} promovido a dueño. Nueva contraseña enviada por correo.`);
      } else {
        toast.success(`${data.email} ahora es dueño del local.`);
      }
      qc.invalidateQueries({ queryKey: ['venues'] });
      qc.invalidateQueries({ queryKey: ['venues', venueId] });
      router.refresh();
    },
    onError: (err) => toast.error(readError(err)),
  });
}

export function useRemoveOwner(venueId: string) {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (userId: string) =>
      clientFetch<{ ok: true }>(`/api/venues/${venueId}/owners/${userId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success('Dueño removido');
      qc.invalidateQueries({ queryKey: ['venues'] });
      qc.invalidateQueries({ queryKey: ['venues', venueId] });
      router.refresh();
    },
    onError: () => toast.error('No pudimos remover al dueño'),
  });
}
