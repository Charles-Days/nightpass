'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Radio } from 'lucide-react';
import { cn } from '@/core/lib/utils/cn';

interface Props {
  startsAt: string;
  endsAt: string;
  className?: string;
  style?: React.CSSProperties;
}

type Phase = 'before' | 'live' | 'ended';

interface State {
  phase: Phase;
  d: number;
  h: number;
  m: number;
  s: number;
}

function compute(startsAt: number, endsAt: number, now: number): State {
  if (now >= endsAt) return { phase: 'ended', d: 0, h: 0, m: 0, s: 0 };
  if (now >= startsAt) return { phase: 'live', d: 0, h: 0, m: 0, s: 0 };
  const diff = Math.max(0, startsAt - now);
  const sec = Math.floor(diff / 1000);
  return {
    phase: 'before',
    d: Math.floor(sec / 86400),
    h: Math.floor((sec % 86400) / 3600),
    m: Math.floor((sec % 3600) / 60),
    s: sec % 60,
  };
}

function Unit({ value, unit }: { value: number; unit: string }) {
  const padded = String(value).padStart(2, '0');
  return (
    <span className="inline-flex items-baseline tabular-nums">
      {/* key={padded} remonta el span → dispara np-digit-pop en cada cambio. */}
      <span
        key={padded}
        className="np-digit-pop font-display text-base font-bold leading-none text-white sm:text-lg"
      >
        {padded}
      </span>
      <span className="ml-0.5 text-xs text-white/50">{unit}</span>
    </span>
  );
}

// Cuenta regresiva en vivo hasta el inicio del evento. Tres fases: faltan X
// (tic-tac cada segundo), EN VIVO (entre inicio y fin), terminó. El tiempo se
// calcula solo en cliente para evitar hydration mismatch — antes de montar
// muestra un placeholder "--" con la misma estructura (sin layout shift).
export function EventCountdown({ startsAt, endsAt, className, style }: Props) {
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    const tick = () => setState(compute(startMs, endMs, Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startMs, endMs]);

  if (state?.phase === 'ended') {
    return (
      <section
        className={cn(
          'np-rise flex items-center gap-3 rounded-[22px] border border-white/14 bg-white/[0.05] px-5 py-3',
          className,
        )}
        style={style}
      >
        <CalendarClock className="size-5 shrink-0 text-white/40" />
        <p className="text-sm font-semibold text-white/55">Este evento ya terminó</p>
      </section>
    );
  }

  if (state?.phase === 'live') {
    return (
      <section
        className={cn(
          'np-countdown-glow relative overflow-hidden rounded-[22px] border border-rose-400/30 bg-gradient-to-r from-rose-500/15 via-fuchsia-500/10 to-purple-500/15 px-5 py-3',
          className,
        )}
        style={style}
      >
        <div className="np-shimmer flex items-center gap-3">
          <span className="np-live-ping relative inline-flex size-3 shrink-0 rounded-full bg-rose-400 text-rose-400" />
          <Radio className="size-5 shrink-0 text-rose-200" />
          <div>
            <p className="font-display text-lg font-bold tracking-tight text-white">En vivo ahora</p>
            <p className="text-xs text-white/65">La fiesta está pasando · entra antes de que se llene</p>
          </div>
        </div>
      </section>
    );
  }

  // before (o placeholder pre-montaje)
  const show = state ?? { d: 0, h: 0, m: 0, s: 0 };
  const ready = state != null;

  return (
    <section
      className={cn(
        'np-countdown-glow relative flex items-center justify-between gap-3 overflow-hidden rounded-[22px] border border-primary/25 bg-gradient-to-r from-primary/12 via-fuchsia-500/8 to-transparent px-5 py-3',
        className,
      )}
      style={style}
    >
      <div className="flex items-center gap-2">
        <CalendarClock className="size-4 shrink-0 text-primary" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
          Empieza en
        </p>
      </div>
      <div
        className={cn(
          'flex items-baseline gap-2 transition-opacity duration-500 sm:gap-2.5',
          ready ? 'opacity-100' : 'opacity-40',
        )}
      >
        <Unit value={show.d} unit="d" />
        <Unit value={show.h} unit="h" />
        <Unit value={show.m} unit="m" />
        <Unit value={show.s} unit="s" />
      </div>
    </section>
  );
}
