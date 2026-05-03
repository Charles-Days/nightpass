'use client';

import { useMutation } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';

export function useOnboardStripe() {
  return useMutation<{ url: string }, Error, { venueId: string }>({
    mutationFn: (input) =>
      clientFetch<{ url: string }>('/api/stripe/connect/onboard', {
        method: 'POST',
        body: input,
      }),
  });
}
