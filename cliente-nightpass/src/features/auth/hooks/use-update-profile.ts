'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { clientFetch } from '@/core/lib/api/client-client';
import type { User } from '@/core/types/api';

export function useUpdateProfile(opts?: { onSuccess?: (user: User) => void }) {
  const router = useRouter();

  return useMutation({
    mutationFn: (body: { name: string }) =>
      clientFetch<User>('/api/auth/me', { method: 'PATCH', body }),
    onSuccess: (user) => {
      router.refresh();
      opts?.onSuccess?.(user);
    },
  });
}
