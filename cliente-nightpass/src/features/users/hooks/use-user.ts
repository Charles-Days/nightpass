'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { Role, UserDetail } from '@/core/types/api';

export function useUser(id: string | null) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => clientFetch<UserDetail>(`/api/users/${id}`),
    enabled: !!id,
  });
}

/** Cambia el rol de un usuario (solo admin). */
export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      clientFetch<UserDetail>(`/api/users/${id}/role`, {
        method: 'PATCH',
        body: { role },
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['users', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
