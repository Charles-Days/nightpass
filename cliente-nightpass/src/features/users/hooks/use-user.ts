'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { UserDetail } from '@/core/types/api';

export function useUser(id: string | null) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => clientFetch<UserDetail>(`/api/users/${id}`),
    enabled: !!id,
  });
}
