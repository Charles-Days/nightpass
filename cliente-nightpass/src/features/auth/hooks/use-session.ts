'use client';

import { useQuery } from '@tanstack/react-query';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { User } from '@/core/types/api';

export const sessionQueryKey = ['session'] as const;

export function useSession(initialUser?: User | null) {
  return useQuery<User | null>({
    queryKey: sessionQueryKey,
    queryFn: async () => {
      try {
        return await clientFetch<User>('/api/auth/me');
      } catch (error) {
        if (error instanceof ClientApiError && (error.status === 401 || error.status === 403)) {
          return null;
        }
        throw error;
      }
    },
    // Sembramos con el user del Server Component para pintar el estado correcto
    // sin parpadeo. `initialDataUpdatedAt: 0` lo marca como obsoleto → revalida
    // contra /api/auth/me al montar, corrigiendo el caso en que el prop del
    // layout llegó viejo (RSC cacheado / shell de PWA generado como invitado).
    initialData: initialUser,
    initialDataUpdatedAt: initialUser !== undefined ? 0 : undefined,
    // Mantenemos los datos actuales mientras refetcheamos, pero validamos pronto.
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}
