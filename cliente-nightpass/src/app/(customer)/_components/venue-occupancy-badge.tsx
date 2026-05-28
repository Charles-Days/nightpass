'use client';

import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGeolocation } from '@/features/geolocation/hooks/use-geolocation';
import { useSession } from '@/features/auth/hooks/use-session';

type OccupancyBucket = 'low' | 'medium' | 'high';

interface OccupancyResponse {
  bucket: OccupancyBucket;
  // backend may include more fields — ignored on client.
}

const LABEL: Record<OccupancyBucket, string> = {
  low: 'Tranquilo',
  medium: 'Moderado',
  high: 'Lleno',
};

const DOT_CLASS: Record<OccupancyBucket, string> = {
  low: 'bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.55)]',
  medium: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.55)] np-dot-pulse-slow',
  high: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] np-dot-pulse-fast',
};

function VenueOccupancyBadgeImpl({
  venueId,
  isClosed = false,
}: {
  venueId: string;
  isClosed?: boolean;
}) {
  const { status } = useGeolocation();
  const session = useSession();
  const hasPermission = status === 'granted';
  const isAuthed = !!session.data;

  const { data } = useQuery<OccupancyResponse | null>({
    queryKey: ['venue-occupancy', venueId],
    queryFn: async () => {
      const res = await fetch(`/api/catalog/venues/${venueId}/occupancy`, {
        credentials: 'include',
      });
      if (!res.ok) return null;
      const json = (await res.json()) as OccupancyResponse | null;
      return json;
    },
    enabled: !isClosed && isAuthed && hasPermission,
    staleTime: 180_000,
    refetchInterval: 300_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (isClosed || !isAuthed || !hasPermission || !data || !data.bucket) return null;
  const bucket = data.bucket;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/75">
      <span
        className={`h-1.5 w-1.5 origin-center transform-gpu rounded-full ${DOT_CLASS[bucket]}`}
        aria-hidden
      />
      {LABEL[bucket]}
    </span>
  );
}

export const VenueOccupancyBadge = memo(VenueOccupancyBadgeImpl);
