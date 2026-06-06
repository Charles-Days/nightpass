'use client';

import * as React from 'react';
import { ArrowDown, Ticket } from 'lucide-react';

interface BuyCtaProps {
  /** id del elemento al que se hace scroll (la sección de boletos). */
  targetId: string;
  /** Texto del botón, p. ej. "Comprar desde $100 MXN". */
  label: string;
}

/**
 * Botón flotante de compra que aparece cuando la sección de boletos NO está a
 * la vista (el usuario está arriba leyendo la info). Al tocarlo baja suave
 * hasta los boletos — como el botón de "ir abajo" de WhatsApp.
 *
 * Se oculta cuando los boletos ya están en pantalla o cuando el usuario los
 * pasó hacia arriba (ya no hace falta).
 */
export function BuyCta({ targetId, label }: BuyCtaProps) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        // Mostrar solo si la sección está por DEBAJO del viewport (aún no llegas).
        setShow(!entry.isIntersecting && entry.boundingClientRect.top > 0);
      },
      { threshold: 0, rootMargin: '0px 0px -45% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);

  const scrollToTarget = () => {
    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-40 flex justify-center px-5 transition-all duration-300 ${
        show ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      }`}
      style={{ bottom: 'calc(96px + env(safe-area-inset-bottom))' }}
    >
      <button
        type="button"
        onClick={scrollToTarget}
        aria-hidden={!show}
        tabIndex={show ? 0 : -1}
        className={`${
          show ? 'pointer-events-auto' : ''
        } inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_8px_28px_-6px_rgba(168,85,247,0.7)] backdrop-blur transition active:scale-95 hover:brightness-110`}
      >
        <Ticket className="size-3.5" />
        {label}
        <ArrowDown className="size-3.5 animate-bounce" />
      </button>
    </div>
  );
}
