'use client';

import { useMutation } from '@tanstack/react-query';
import type { EmailChangeInput } from '../schemas/account.schema';
import { clientFetch } from '@/core/lib/api/client-client';

export function useRequestEmailChange(opts?: { onSuccess?: () => void }) {
  return useMutation({
    mutationFn: (body: EmailChangeInput) =>
      clientFetch<{ ok: boolean }>('/api/auth/email-change', {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      opts?.onSuccess?.();
    },
  });
}
