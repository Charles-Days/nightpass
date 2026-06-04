'use client';

import * as React from 'react';
import { BellRing, Loader2 } from 'lucide-react';
import { usePushNotifications } from '../hooks/use-push-notifications';

/**
 * Botón para enviar una notificación push de prueba al propio dispositivo.
 * Solo aparece cuando la sesión ya está suscrita (el banner se encarga del alta).
 * Pensado para el panel — valida el pipeline backend → service worker end-to-end.
 */
export function PushTestButton() {
  const { supported, isSubscribed, sendTest } = usePushNotifications();
  const [sending, setSending] = React.useState(false);

  if (!supported || !isSubscribed) return null;

  const onClick = async () => {
    setSending(true);
    try {
      await sendTest();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 border-b border-primary/20 bg-primary/[0.06] px-4 py-2 text-xs text-primary sm:px-6 sm:text-sm">
      <span className="flex items-center gap-2">
        <BellRing className="size-3.5 shrink-0" />
        Notificaciones activas en este dispositivo.
      </span>
      <button
        type="button"
        onClick={onClick}
        disabled={sending}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-semibold transition hover:bg-primary/15 disabled:opacity-60"
      >
        {sending ? <Loader2 className="size-3.5 animate-spin" /> : null}
        Enviar prueba
      </button>
    </div>
  );
}
