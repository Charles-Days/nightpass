'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';

export interface InviteEvent {
  id: string;
  title: string;
  coverImageUrl: string | null;
  startsAt: string | null;
  placeName: string | null;
}

interface RawEvent {
  id: string;
  title: string;
  startsAt: string | null;
  coverImageUrl: string | null;
  externalVenueName: string | null;
  venue: { name: string } | null;
  promoter: { name: string } | null;
}

/** Eventos próximos para armar un link de invitación por evento (vale doble). */
export function useInviteEvents(enabled: boolean) {
  return useQuery({
    queryKey: ['invite-events'],
    enabled,
    staleTime: 300_000,
    queryFn: async () => {
      const res = await clientFetch<{ items: RawEvent[] }>(
        '/api/catalog/events?limit=30',
      );
      return (res.items ?? []).map<InviteEvent>((e) => ({
        id: e.id,
        title: e.title,
        coverImageUrl: e.coverImageUrl,
        startsAt: e.startsAt,
        placeName: e.venue?.name ?? e.promoter?.name ?? e.externalVenueName ?? null,
      }));
    },
  });
}
