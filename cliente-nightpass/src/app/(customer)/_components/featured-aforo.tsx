'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { LogIn, MapPin, Loader2, Moon } from 'lucide-react';
import { useGeolocation } from '@/features/geolocation/hooks/use-geolocation';
import { useSession } from '@/features/auth/hooks/use-session';
import { paths } from '@/core/config/paths';

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

export function FeaturedAforo({
  venueId,
  isClosed = false,
}: {
  venueId: string;
  isClosed?: boolean;
}) {
  const { status, request } = useGeolocation();
  const session = useSession();
  const [requesting, setRequesting] = useState(false);
  const hasPermission = status === 'granted';
  const isAuthed = !!session.data;

  const { data } = useQuery<OccupancyResponse | null>({
    queryKey: ['venue-occupancy', venueId],
    queryFn: async () => {
      const res = await fetch(`/api/catalog/venues/${venueId}/occupancy`, {
        credentials: 'include',
      });
      if (!res.ok) return null;
      return (await res.json()) as OccupancyResponse | null;
    },
    enabled: !isClosed && isAuthed && hasPermission,
    staleTime: 180_000,
    refetchInterval: 300_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (isClosed) {
    return (
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
          Aforo en vivo
        </p>
        <div className="mt-2 flex items-center gap-2 rounded-[12px] border border-white/8 bg-white/[0.02] px-3 py-2 text-[11px] text-muted-foreground">
          <Moon className="size-3.5 shrink-0 text-rose-300/70" />
          <span>Cerrado · sin aforo</span>
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
          Aforo en vivo
        </p>
        <Link
          href={paths.iniciarSesion}
          className="mt-2 flex items-center gap-2 rounded-[12px] border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] font-semibold text-primary transition hover:bg-primary/15"
        >
          <LogIn className="size-3.5 shrink-0" />
          <span>Inicia sesión para ver el aforo</span>
        </Link>
      </div>
    );
  }

  if (!hasPermission) {
    const handleActivate = async () => {
      setRequesting(true);
      try {
        await request();
      } finally {
        setRequesting(false);
      }
    };
    return (
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
          Aforo en vivo
        </p>
        <button
          type="button"
          onClick={handleActivate}
          disabled={requesting}
          className="mt-2 flex w-full items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-[11px] text-white/70 transition hover:bg-white/[0.06] disabled:opacity-60"
        >
          {requesting ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
          ) : (
            <MapPin className="size-3.5 shrink-0 text-primary" />
          )}
          <span>Activa tu ubicación para ver el aforo</span>
        </button>
      </div>
    );
  }

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
