'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';

interface ThankYouPreview {
  subject: string;
  html: string;
  email: string;
  storyCardUrl: string;
}

export function useThankYouPreview(eventId: string, orderId: string | null) {
  return useQuery<ThankYouPreview>({
    queryKey: ['thank-you-preview', eventId, orderId],
    queryFn: () =>
      clientFetch<ThankYouPreview>(`/api/events/${eventId}/orders/${orderId}/thank-you/preview`),
    enabled: !!orderId,
    staleTime: 60_000,
  });
}
