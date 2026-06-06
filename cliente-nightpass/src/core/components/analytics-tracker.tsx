'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Deriva el paso del embudo a partir de la ruta. */
function deriveStep(path: string): { name: string; eventId?: string } {
  const ev = path.match(/^\/app\/evento\/([^/?#]+)/);
  if (ev) {
    const id = ev[1];
    return { name: 'view_event', eventId: UUID_RE.test(id) ? id : undefined };
  }
  if (path.startsWith('/app/checkout/')) return { name: 'open_checkout' };
  if (path.startsWith('/app/registro')) return { name: 'view_signup' };
  return { name: 'page_view' };
}

/**
 * Registra cada cambio de ruta como un paso del recorrido (page_view,
 * view_event, open_checkout, view_signup) para reconstruir el embudo en el
 * panel admin. El visitorId lo resuelve el route handler vía cookie np_vid.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const { name, eventId } = deriveStep(pathname);
    void fetch('/api/metrics/track', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, path: pathname, eventId }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
