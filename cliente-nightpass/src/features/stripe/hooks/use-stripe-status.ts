'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';

export interface StripeStatus {
  accountId: string | null;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
}

export function useStripeStatus(venueId: string | undefined) {
  return useQuery<StripeStatus>({
    queryKey: ['stripe-status', venueId],
    enabled: !!venueId,
    queryFn: () =>
      clientFetch<StripeStatus>(
        `/api/stripe/connect/status?venueId=${venueId}`,
      ),
    refetchOnWindowFocus: true,
  });
}
