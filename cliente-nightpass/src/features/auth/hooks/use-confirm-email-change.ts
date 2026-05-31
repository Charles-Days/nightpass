'use client';

import { useMutation } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';

export function useConfirmEmailChange(opts?: { onSuccess?: () => void }) {
  return useMutation({
    mutationFn: (token: string) =>
      clientFetch<{ ok: boolean }>('/api/auth/confirm-email-change', {
        method: 'POST',
        body: { token },
      }),
    onSuccess: () => {
      opts?.onSuccess?.();
    },
  });
}
