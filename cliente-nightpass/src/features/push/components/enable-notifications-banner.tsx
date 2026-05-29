'use client';

import * as React from 'react';
import { Bell, Loader2, X } from 'lucide-react';
import { usePushNotifications } from '../hooks/use-push-notifications';

const DISMISS_KEY = 'np-push-banner-dismissed';

export function EnableNotificationsBanner() {
  const { supported, permission, isSubscribed, loading, subscribe } =
    usePushNotifications();
  const [dismissed, setDismissed] = React.useState(true);

  // Lee el dismiss persistido (evita parpadeo en SSR → hidrata cerrado).
  React.useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  // Ocultar si: no soporta, ya suscrito, permiso denegado, o cerrado.
  if (!supported || isSubscribed || permission === 'denied' || dismissed) {
    return null;
  }

  return (
    <div className="flex flex-col items-start gap-2 border-b border-primary/30 bg-primary/10 px-4 py-2.5 text-xs text-primary sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:text-sm">
      <span className="flex items-center gap-2">
        <Bell className="size-3.5 shrink-0" />
        Activa las notificaciones para enterarte de ventas, eventos y check-ins.
      </span>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={subscribe}
          disabled={loading}
          className="inline-flex items-center gap-1.5 font-semibold underline hover:no-underline disabled:opacity-60"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Activar ahora
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar"
          className="text-primary/60 hover:text-primary"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
