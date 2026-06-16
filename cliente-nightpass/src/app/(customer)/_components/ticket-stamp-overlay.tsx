'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Moon } from 'lucide-react';
import { StarfieldAmbient } from '@/app/(customer)/_components/starfield-ambient';

interface Props {
  /** Título del evento, para personalizar el boleto. */
  eventTitle?: string;
  /** Se llama cuando termina la animación (momento de navegar a Pases). */
  onComplete: () => void;
}

const STAMP_MS = 2200;

/**
 * Animación de "boleto sellado" al confirmar la compra: un boleto NightPass
 * entra, el sello PAGADO se estampa con golpe + sacudida, y aparece la frase
 * antes de mandar al usuario a sus pases. Portal a `body` (z máximo) sobre un
 * fondo espacial. Llama `onComplete` al terminar.
 *
 * Respeta `prefers-reduced-motion`: el CSS acorta todo y navega rápido.
 */
export function TicketStampOverlay({ eventTitle, onComplete }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(onComplete, reduce ? 600 : STAMP_MS);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [onComplete]);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-hidden
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden px-8"
    >
      <StarfieldAmbient />

      <div className="relative z-10 w-full max-w-[18rem]">
        {/* Boleto */}
        <div className="np-ticket relative overflow-hidden rounded-[20px] border border-white/15 bg-gradient-to-b from-[#1d1036] to-[#120a24] shadow-[0_24px_70px_-20px_rgba(168,85,247,0.6)]">
          <div className="px-6 pb-5 pt-7 text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#9333ea] to-[#a855f7] text-white shadow-lg shadow-purple-900/50">
              <Moon className="size-5" />
            </span>
            <p className="mt-3 font-display text-lg font-bold tracking-tight text-white">
              NightPass
            </p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              Acceso confirmado
            </p>
            {eventTitle ? (
              <p className="mt-2 line-clamp-2 text-sm text-white/75">{eventTitle}</p>
            ) : null}
          </div>

          {/* Perforación + muescas del stub. */}
          <div className="relative">
            <span className="absolute -left-2.5 top-1/2 size-5 -translate-y-1/2 rounded-full bg-[#0a0612]" />
            <span className="absolute -right-2.5 top-1/2 size-5 -translate-y-1/2 rounded-full bg-[#0a0612]" />
            <div className="mx-5 border-t border-dashed border-white/25" />
          </div>

          <div className="px-6 py-3 text-center">
            <p className="text-[11px] text-white/55">Tu acceso a la mejor noche.</p>
          </div>

          {/* Sello PAGADO. */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="np-stamp-ring absolute size-28 rounded-2xl border-2 border-emerald-300/50" />
            <span className="np-stamp flex items-center gap-1.5 rounded-2xl border-[3px] border-emerald-300/80 bg-emerald-400/10 px-4 py-2 font-display text-2xl font-extrabold tracking-wider text-emerald-200 shadow-[0_0_30px_-4px_rgba(52,211,153,0.7)] backdrop-blur-[1px]">
              <Check className="size-6" strokeWidth={3} />
              PAGADO
            </span>
          </div>
        </div>

        <p className="np-success-up mt-6 text-center font-display text-base font-semibold text-white/90">
          Listo · vamos a tus pases…
        </p>
      </div>
    </div>,
    document.body,
  );
}
