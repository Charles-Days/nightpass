'use client';

import { useQuery } from '@tanstack/react-query';

type OccupancyBucket = 'low' | 'medium' | 'high';

interface OccupancyResponse {
  bucket: OccupancyBucket;
}

const LABEL: Record<OccupancyBucket, string> = {
  low: 'Tranquilo',
  medium: 'Moderado',
  high: 'Lleno',
};

const LEVEL: Record<OccupancyBucket, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const SEGMENT_COLOR: Record<OccupancyBucket, string> = {
  low: 'bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.6)]',
  medium: 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]',
  high: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]',
};

const PULSE_CLASS: Record<OccupancyBucket, string> = {
  low: '',
  medium: 'np-dot-pulse-slow',
  high: 'np-dot-pulse-fast',
};

const LABEL_COLOR: Record<OccupancyBucket, string> = {
  low: 'text-emerald-300',
  medium: 'text-amber-300',
  high: 'text-rose-300',
};

export function FeaturedAforo({ venueId }: { venueId: string }) {
  const { data } = useQuery<OccupancyResponse | null>({
    queryKey: ['venue-occupancy', venueId],
    queryFn: async () => {
      const res = await fetch(`/api/catalog/venues/${venueId}/occupancy`, {
        credentials: 'include',
      });
      if (!res.ok) return null;
      return (await res.json()) as OccupancyResponse | null;
    },
    staleTime: 60_000,
    refetchInterval: 90_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const bucket = data?.bucket ?? 'low';
  const level = LEVEL[bucket];

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
          Aforo en vivo
        </p>
        <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${LABEL_COLOR[bucket]}`}>
          {LABEL[bucket]}
        </p>
      </div>
      <div className="mt-2 flex gap-1.5">
        {[1, 2, 3].map((i) => {
          const filled = i <= level;
          const isLeading = i === level;
          return (
            <div
              key={i}
              className={`h-1.5 flex-1 origin-center transform-gpu rounded-full transition-colors duration-500 ${
                filled
                  ? `${SEGMENT_COLOR[bucket]} ${isLeading ? PULSE_CLASS[bucket] : ''}`
                  : 'bg-white/[0.07]'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
