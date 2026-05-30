'use client';

import { useEffect } from 'react';

// iOS Safari (pestaña normal) ignora user-scalable=no del viewport, así que el
// pinch-zoom sigue activo aunque el meta lo prohíba. Estos listeners lo bloquean:
//  - gesture* → eventos de pellizco propios de WebKit/iOS.
//  - touchmove con 2+ dedos → respaldo para el gesto de zoom.
//  - doble-tap → zoom por doble toque rápido.
// En Android/PWA standalone el viewport ya basta; esto solo refuerza iOS Safari.
export function NoPinchZoom() {
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };

    let lastTouchEnd = 0;
    const onTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    };

    document.addEventListener('gesturestart', prevent);
    document.addEventListener('gesturechange', prevent);
    document.addEventListener('gestureend', prevent);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('gesturestart', prevent);
      document.removeEventListener('gesturechange', prevent);
      document.removeEventListener('gestureend', prevent);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return null;
}
