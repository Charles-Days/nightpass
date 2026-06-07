'use client';

import { useEffect } from 'react';
import { saveInviteRef, extractEventIdFromPath } from './invite-ref';

/**
 * Captura el `?inv=CODE` de cualquier página del cliente: lo guarda para usarlo
 * al registrarse y avisa al backend de la visita (acredita poquitos NPP al
 * dueño del código). El visitorId lo resuelve el route handler vía cookie np_vid;
 * el backend deduplica por visitante. Guard de sesión para no repetir el beacon.
 */
export function InviteCapture() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('inv');
    if (!code) return;

    // Si entró por un link de evento (/app/evento/:id?inv=), el referido vale doble.
    const eventId = extractEventIdFromPath(window.location.pathname);
    saveInviteRef(code, eventId ?? undefined);

    // Guard por scope: general y cada evento cuentan por separado.
    const guard = `np_inv_visited:${code}:${eventId ?? 'gen'}`;
    try {
      if (sessionStorage.getItem(guard)) return;
      sessionStorage.setItem(guard, '1');
    } catch {
      // sin sessionStorage seguimos: el backend dedup por visitorId igual.
    }

    void fetch('/api/referral/visit', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, eventId: eventId ?? undefined }),
    }).catch(() => {});
  }, []);

  return null;
}
