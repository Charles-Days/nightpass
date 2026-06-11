'use client';

import { useEffect, useState } from 'react';
import { Flame, Users } from 'lucide-react';
import { cn } from '@/core/lib/utils/cn';

interface Props {
  eventId: string;
  /** Total inicial de "voy a ir" (lo calcula el backend). */
  count?: number | null;
  /** Variante read-only chica para las cards (sin botón). */
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Flag local: recuerda que este navegador ya tocó "voy a ir" para pintar el
// estado al recargar. El dedup real lo hace el SET en Redis (server-side); esto
// es solo cosmético — si se borra el storage, el botón vuelve a aparecer pero
// tocar de nuevo no recuenta.
const goneKey = (id: string) => `np_going_${id}`;

// No hay aforo/tope real, así que la barra se llena hacia un "hito" redondo que
// sube en escalones. Al acercarse al hito el siguiente se desbloquea y la barra
// vuelve a bajar — sensación de momentum continuo (FOMO) sin un número visible.
const MILESTONES = [20, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000];
function softGoal(n: number): number {
  for (const m of MILESTONES) if (n < m) return m;
  return Math.ceil((n + 1) / 1000) * 1000;
}

// Porcentaje de llenado hacia el hito, con un piso para que nunca se vea vacía.
function fillPct(n: number): number {
  if (n <= 0) return 0;
  return Math.min(100, Math.max(8, Math.round((n / softGoal(n)) * 100)));
}

// Etiqueta de vibra según qué tan llena va (sustituye al número).
function hypeLabel(pct: number): string {
  if (pct >= 80) return 'Casi lleno';
  if (pct >= 45) return 'En tendencia';
  return 'Se está llenando';
}

// "Voy a ir" anónimo: un clic, sin cuenta. Reemplaza la barra de aforo. El número
// es prueba social (la gente lee "X asistirán" como asistencia confirmada),
// aunque por dentro solo es un interesado deduplicado por dispositivo.
export function EventGoing({ eventId, count, compact, className, style }: Props) {
  const [total, setTotal] = useState(count ?? 0);
  const [going, setGoing] = useState(false);
  const [pending, setPending] = useState(false);
  // Ancho de la barra: arranca en 0 y anima hacia el % objetivo al confirmar.
  const [barW, setBarW] = useState(0);

  useEffect(() => setTotal(count ?? 0), [count]);

  // Cuando ya va a ir, anima la barra hasta su % (un frame después para que la
  // transición CSS corra desde 0).
  useEffect(() => {
    if (!going) {
      setBarW(0);
      return;
    }
    const target = fillPct(total);
    const raf = requestAnimationFrame(() => setBarW(target));
    return () => cancelAnimationFrame(raf);
  }, [going, total]);
  useEffect(() => {
    try {
      if (localStorage.getItem(goneKey(eventId))) setGoing(true);
    } catch {
      /* storage bloqueado → el server igual deduplica */
    }
  }, [eventId]);

  // Card read-only: solo la barra de llenado, nunca el número.
  if (compact) {
    const pct = fillPct(total);
    return (
      <div style={style} className={cn('w-full max-w-[240px]', className)}>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="np-shimmer h-full rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] shadow-[0_0_10px_-2px_rgba(168,85,247,0.6)]"
            style={{ width: `${Math.max(pct, total > 0 ? 8 : 4)}%` }}
          />
        </div>
      </div>
    );
  }

  async function handleGoing() {
    if (going || pending) return;
    setPending(true);
    // Optimista: súbelo ya; el server confirma el total real.
    setGoing(true);
    setTotal((t) => t + 1);
    try {
      localStorage.setItem(goneKey(eventId), '1');
    } catch {
      /* noop */
    }
    try {
      const r = await fetch(`/api/events/${eventId}/going`, { method: 'POST' });
      if (r.ok) {
        const data = (await r.json()) as { count?: number };
        if (typeof data.count === 'number' && data.count > 0) setTotal(data.count);
      }
    } catch {
      /* dejamos el incremento optimista */
    } finally {
      setPending(false);
    }
  }

  // Ya va a ir: nada de pastilla verde ni número. Una barra que se llena hacia
  // el hito + etiqueta de vibra, para dar sensación de evento llenándose.
  if (going) {
    const pct = fillPct(total);
    return (
      <div style={style} className={cn('flex flex-col gap-1.5', className)}>
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-primary">
          <Flame className="size-3.5 shrink-0 animate-pulse" />
          {hypeLabel(pct)}
        </span>
        <div className="h-2 w-full max-w-[280px] overflow-hidden rounded-full bg-white/10">
          <div
            className="np-shimmer h-full rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] shadow-[0_0_12px_-1px_rgba(168,85,247,0.7)] transition-[width] duration-1000 ease-out"
            style={{ width: `${barW}%` }}
          />
        </div>
      </div>
    );
  }

  // Antes de confirmar: solo el botón, sin barra ni número.
  return (
    <div style={style} className={cn('flex', className)}>
      <button
        type="button"
        onClick={handleGoing}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)] transition active:scale-95 hover:brightness-110 disabled:opacity-70"
      >
        <Users className="size-4" /> Voy a ir
      </button>
    </div>
  );
}
