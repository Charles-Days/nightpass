'use client';

import { useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/core/lib/utils/cn';

interface Props {
  sold?: number | null;
  capacity?: number | null;
  /** Variante chica para las cards de la lista. */
  compact?: boolean;
  className?: string;
}

// Cuenta el número hacia su valor objetivo (rAF, ~700ms con ease-out) la primera
// vez que el componente entra en viewport. Devuelve el valor actual a mostrar.
function useCountUp(target: number, run: boolean) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!run) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    const dur = 700;
    let start: number | null = null;
    const step = (t: number) => {
      if (start == null) start = t;
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, run]);
  return value;
}

// Indicador de aforo basado en pases vendidos (Stripe + efectivo). Pinta una
// barra de llenado animada + un estado: "En tendencia" (>70%), "Casi agotado"
// (>90%), "Agotado" (100%). No expone números de inventario, solo el porcentaje.
// Cuando va caliente (>=70%) la barra brilla (shimmer) y pulsa para crear FOMO.
export function EventAforo({ sold, capacity, compact, className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [seen, setSeen] = useState(false);

  // Arranca la animación solo al ser visible (las cards de lista pueden estar
  // fuera de viewport). Fallback a true si no hay IntersectionObserver.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const validCapacity = capacity != null && capacity > 0;
  const pct = validCapacity ? Math.min(100, Math.round(((sold ?? 0) / capacity!) * 100)) : 0;
  const animatedPct = useCountUp(pct, seen);

  if (!validCapacity) return null;

  const full = pct >= 100;
  const almost = pct >= 90;
  const trending = pct >= 70;

  const label = full
    ? 'Agotado'
    : almost
      ? 'Casi agotado'
      : trending
        ? 'En tendencia'
        : `${animatedPct}% lleno`;

  const tone = full || almost ? 'text-rose-300' : trending ? 'text-amber-300' : 'text-white/55';
  const bar = full || almost ? 'bg-rose-400' : trending ? 'bg-amber-400' : 'bg-primary';
  const glow =
    full || almost
      ? 'shadow-[0_0_12px_-1px_rgba(251,113,133,0.7)]'
      : trending
        ? 'shadow-[0_0_12px_-1px_rgba(251,191,36,0.6)]'
        : '';

  return (
    <div ref={ref} className={cn('w-full', compact ? 'space-y-1' : 'space-y-1.5', className)}>
      <div className={cn('flex items-center gap-1 font-semibold', compact ? 'text-[10px]' : 'text-[11px]', tone)}>
        {trending && <Flame className={cn('shrink-0', compact ? 'size-2.5' : 'size-3', !full && 'animate-pulse')} />}
        <span className="tabular-nums">{label}</span>
      </div>
      <div className={cn('w-full overflow-hidden rounded-full bg-white/10', compact ? 'h-1' : 'h-1.5')}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out',
            bar,
            glow,
            trending && 'np-shimmer',
          )}
          style={{ width: `${Math.max(seen ? animatedPct : 0, 4)}%` }}
        />
      </div>
    </div>
  );
}
