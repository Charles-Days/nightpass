'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { clientFetch } from '@/core/lib/api/client-client';
import type { User } from '@/core/types/api';

export interface UpdateLocationInput {
  state?: string;
  city?: string;
  /** Consentimiento para aparecer en el ranking público. */
  rankingOptIn?: boolean;
}

/**
 * Guarda el estado + ciudad declarados por el usuario en su cuenta
 * (PATCH /auth/me). Se usa una sola vez para activar el ranking de su ciudad.
 */
export function useUpdateLocation() {
  const router = useRouter();

  return useMutation<User, unknown, UpdateLocationInput>({
    mutationFn: (input) =>
      clientFetch<User>('/api/auth/me', {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: () => {
      router.refresh();
    },
  });
}
