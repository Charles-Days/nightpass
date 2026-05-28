'use client';

import { useQuery } from '@tanstack/react-query';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { User } from '@/core/types/api';

export const sessionQueryKey = ['session'] as const;

export function useSession() {
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
    // Mantenemos los datos actuales mientras refetcheamos, pero validamos pronto.
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}
