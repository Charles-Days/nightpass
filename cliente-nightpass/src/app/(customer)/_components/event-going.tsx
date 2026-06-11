'use client';

import { useEffect, useState } from 'react';
import { Check, Users } from 'lucide-react';
import { cn } from '@/core/lib/utils/cn';

interface Props {
  eventId: string;
  /** Total inicial de "voy a ir" (lo calcula el backend). */
  count?: number | null;
  /** Variante read-only chica para las cards (sin botón). */
  compact?: boolean;
  className?: string;
}

// Flag local: recuerda que este navegador ya tocó "voy a ir" para pintar el
// estado al recargar. El dedup real lo hace el SET en Redis (server-side); esto
// es solo cosmético — si se borra el storage, el botón vuelve a aparecer pero
// tocar de nuevo no recuenta.
const goneKey = (id: string) => `np_going_${id}`;

function goingLabel(n: number) {
  return n === 1 ? '1 asistirá' : `${n} asistirán`;
}

// "Voy a ir" anónimo: un clic, sin cuenta. Reemplaza la barra de aforo. El número
// es prueba social (la gente lee "X asistirán" como asistencia confirmada),
// aunque por dentro solo es un interesado deduplicado por dispositivo.
export function EventGoing({ eventId, count, compact, className }: Props) {
  const [total, setTotal] = useState(count ?? 0);
  const [going, setGoing] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => setTotal(count ?? 0), [count]);
  useEffect(() => {
    try {
      if (localStorage.getItem(goneKey(eventId))) setGoing(true);
    } catch {
      /* storage bloqueado → el server igual deduplica */
    }
  }, [eventId]);

  // Card read-only: solo el número, y solo si hay ≥1 (evita "0 asistirán").
  if (compact) {
    if (total <= 0) return null;
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary',
          className,
        )}
      >
        <Users className="size-3 shrink-0" />
        <span className="tabular-nums">{goingLabel(total)}</span>
      </span>
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

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <p className="flex items-center gap-1.5 text-sm">
        <Users className="size-4 shrink-0 text-primary" />
        {total > 0 ? (
          <>
            <span className="font-bold tabular-nums text-primary">{total}</span>
            <span className="text-muted-foreground">
              {total === 1 ? 'persona asistirá' : 'personas asistirán'}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Sé el primero en confirmar asistencia</span>
        )}
      </p>
      <button
        type="button"
        onClick={handleGoing}
        disabled={going || pending}
        aria-pressed={going}
        className={cn(
          'inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-95 disabled:cursor-default',
          going
            ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
            : 'bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)] hover:brightness-110',
        )}
      >
        {going ? (
          <>
            <Check className="size-4" /> Vas a ir
          </>
        ) : (
          <>
            <Users className="size-4" /> Voy a ir
          </>
        )}
      </button>
    </div>
  );
}
