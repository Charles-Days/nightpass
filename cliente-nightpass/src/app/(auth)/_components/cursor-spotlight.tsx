'use client';

import * as React from 'react';

/**
 * Glow radial que sigue el cursor dentro del panel del formulario.
 * Escucha pointermove en el ancestro posicionado más cercano y escribe
 * --mx / --my en su propio estilo; el degradado de .np-spotlight los lee.
 * rAF-throttled para no disparar layout en cada evento.
 */
export function CursorSpotlight() {
  const ref = React.useRef<HTMLDivElement>(null);
  const frame = React.useRef(0);

  React.useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host) return;

    const onMove = (e: PointerEvent) => {
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const r = host.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        el.style.setProperty('--mx', `${x}%`);
        el.style.setProperty('--my', `${y}%`);
      });
    };
    const onEnter = () => el.setAttribute('data-active', 'true');
    const onLeave = () => el.setAttribute('data-active', 'false');

    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerenter', onEnter);
    host.addEventListener('pointerleave', onLeave);
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerenter', onEnter);
      host.removeEventListener('pointerleave', onLeave);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  return <div ref={ref} aria-hidden className="np-spotlight hidden lg:block" />;
}
