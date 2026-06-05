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

function Segment({ value, label }: { value: number; label: string }) {
  const padded = String(value).padStart(2, '0');
  return (
    <div className="flex flex-col items-center">
      {/* key={padded} remonta el span → dispara np-digit-pop en cada cambio. */}
      <div className="overflow-hidden rounded-xl border border-white/14 bg-white/[0.07] px-2.5 py-1.5 tabular-nums sm:px-3.5 sm:py-2">
        <span
          key={padded}
          className="np-digit-pop block font-display text-2xl font-bold leading-none text-white sm:text-3xl"
        >
          {padded}
        </span>
      </div>
      <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45 sm:text-[10px]">
        {label}
      </span>
    </div>
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
          'np-rise flex items-center gap-3 rounded-[22px] border border-white/14 bg-white/[0.05] px-5 py-4',
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
          'np-countdown-glow relative overflow-hidden rounded-[22px] border border-rose-400/30 bg-gradient-to-r from-rose-500/15 via-fuchsia-500/10 to-purple-500/15 px-5 py-4',
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
        'np-countdown-glow relative overflow-hidden rounded-[22px] border border-primary/25 bg-gradient-to-r from-primary/12 via-fuchsia-500/8 to-transparent px-5 py-4',
        className,
      )}
      style={style}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <CalendarClock className="size-5 shrink-0 text-primary" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              Empieza en
            </p>
            <p className="text-xs text-white/60">No te quedes fuera</p>
          </div>
        </div>
        <div
          className={cn(
            'flex items-start gap-2 transition-opacity duration-500 sm:gap-3',
            ready ? 'opacity-100' : 'opacity-40',
          )}
        >
          <Segment value={show.d} label="Días" />
          <span className="pt-1.5 font-display text-2xl font-bold text-white/25 sm:text-3xl">:</span>
          <Segment value={show.h} label="Hrs" />
          <span className="pt-1.5 font-display text-2xl font-bold text-white/25 sm:text-3xl">:</span>
          <Segment value={show.m} label="Min" />
          <span className="pt-1.5 font-display text-2xl font-bold text-white/25 sm:text-3xl">:</span>
          <Segment value={show.s} label="Seg" />
        </div>
      </div>
    </section>
  );
}
