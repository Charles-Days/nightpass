'use client';

import { useMutation } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';

export function useOnboardStripePromoter() {
  return useMutation<{ url: string }, Error, void>({
    mutationFn: () =>
      clientFetch<{ url: string }>('/api/stripe/connect/onboard-promoter', {
        method: 'POST',
      }),
  });
}
