'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';

export interface StripePromoterStatus {
  connected: boolean;
  chargesEnabled?: boolean;
  detailsSubmitted?: boolean;
  stripeAccountId?: string;
}

export function useStripeStatusPromoter(enabled = true) {
  return useQuery<StripePromoterStatus>({
    queryKey: ['stripe-status-promoter'],
    enabled,
    queryFn: () =>
      clientFetch<StripePromoterStatus>('/api/stripe/connect/status-promoter'),
    refetchOnWindowFocus: true,
  });
}
