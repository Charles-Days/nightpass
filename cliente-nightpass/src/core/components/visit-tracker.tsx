'use client';

import { useEffect } from 'react';

const SESSION_KEY = 'np_visit_sent';

// Dispara 1 beacon de visita por sesión de navegador. El guard de
// sessionStorage evita re-disparar al navegar/recargar dentro de la misma
// sesión; el HyperLogLog del backend deduplica entre sesiones del mismo día.
export function VisitTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* sessionStorage bloqueado → igual mandamos, el HLL deduplica */
    }
    void fetch('/api/metrics/visit', { method: 'POST', keepalive: true }).catch(() => {});
  }, []);

  return null;
}
