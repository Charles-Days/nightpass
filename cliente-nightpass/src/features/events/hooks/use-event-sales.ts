'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';

export interface EventSalesTier {
  tierId: string;
  name: string;
  priceCents: number;
  currency: string;
  sold: number;
  capacity: number | null;
}

export interface EventSalesOrder {
  id: string;
  createdAt: string;
  totalCents: number;
  currency: string;
  tier: { id: string; name: string };
  user: { id: string; email: string; name: string | null };
  passUsed: boolean;
}

export interface EventSales {
  eventId: string;
  totalCents: number;
  totalFeeCents: number;
  orderCount: number;
  passesIssued: number;
  currency: string;
  byTier: EventSalesTier[];
  orders: EventSalesOrder[];
}

export function useEventSales(eventId: string | undefined, enabled = true) {
  return useQuery<EventSales>({
    queryKey: ['event-sales', eventId],
    enabled: !!eventId && enabled,
    queryFn: () => clientFetch<EventSales>(`/api/events/${eventId}/sales`),
  });
}
