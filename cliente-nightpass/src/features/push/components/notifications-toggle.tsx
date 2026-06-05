'use client';

import * as React from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { cn } from '@/core/lib/utils/cn';
import { usePushNotifications } from '../hooks/use-push-notifications';

/**
 * Toggle permanente de notificaciones push para el perfil del cliente.
 * Reusa el mismo hook que el banner — fuente única de verdad de la suscripción.
 */
export function NotificationsToggle() {
  const { supported, permission, isSubscribed, loading, subscribe, unsubscribe, sendTest } =
    usePushNotifications();
  const [sending, setSending] = React.useState(false);

  const denied = permission === 'denied';

  const onTest = async () => {
    setSending(true);
    try {
      await sendTest();
    } finally {
      setSending(false);
    }
  };

  const toggle = () => {
    if (loading || !supported || denied) return;
    if (isSubscribed) {
      void unsubscribe();
    } else {
      void subscribe();
    }
  };

  return (
    <div className="rounded-[20px] border border-white/14 bg-white/[0.05] p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
            {isSubscribed ? (
              <Bell className="size-4 text-primary" />
            ) : (
              <BellOff className="size-4 text-white/45" />
            )}
            Notificaciones push
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Entérate de ventas, eventos y check-ins en este dispositivo. Puedes
            desactivarlas cuando quieras.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isSubscribed}
          onClick={toggle}
          disabled={loading || !supported || denied}
          className={cn(
            'relative mt-1 h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50',
            isSubscribed ? 'bg-primary' : 'bg-white/15',
          )}
        >
          <span
            className={cn(
              'absolute top-1 grid size-5 place-items-center rounded-full bg-white transition-all',
              isSubscribed ? 'left-6' : 'left-1',
            )}
          >
            {loading ? (
              <Loader2 className="size-3 animate-spin text-primary" />
            ) : null}
          </span>
        </button>
      </div>

      {isSubscribed ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/8 pt-4">
          <p className="text-[11px] text-muted-foreground">
            ¿Quieres comprobar que llegan? Envíate una de prueba.
          </p>
          <button
            type="button"
            onClick={onTest}
            disabled={sending}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/15 disabled:opacity-60"
          >
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Enviar prueba
          </button>
        </div>
      ) : null}

      {!supported ? (
        <p className="mt-4 border-t border-white/12 pt-4 text-[11px] leading-relaxed text-white/45">
          Tu navegador no soporta notificaciones push. En iOS, añade NightPass a
          la pantalla de inicio para activarlas.
        </p>
      ) : denied ? (
        <p className="mt-4 border-t border-white/12 pt-4 text-[11px] leading-relaxed text-amber-300/80">
          Bloqueaste las notificaciones en el navegador. Actívalas desde los
          ajustes del sitio para volver a recibirlas.
        </p>
      ) : null}
    </div>
  );
}
