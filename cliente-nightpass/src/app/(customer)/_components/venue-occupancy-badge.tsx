'use client';

import { useQuery } from '@tanstack/react-query';

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
  low: 'bg-white/40',
  medium: 'bg-amber-400',
  high: 'bg-red-500',
};

export function VenueOccupancyBadge({ venueId }: { venueId: string }) {
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
    staleTime: 60_000,
    refetchInterval: 90_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (!data || !data.bucket) return null;
  const bucket = data.bucket;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/75">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[bucket]}`} aria-hidden />
      {LABEL[bucket]}
    </span>
  );
}
