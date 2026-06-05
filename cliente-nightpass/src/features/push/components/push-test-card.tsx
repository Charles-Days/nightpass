'use client';

import * as React from 'react';
import { Bell, BellRing, Loader2, Users } from 'lucide-react';
import { clientFetch } from '@/core/lib/api/client-client';
import { usePushNotifications } from '../hooks/use-push-notifications';
import { PushBroadcastDialog } from './push-broadcast-dialog';

interface PushStats {
  devices: number;
  people: number;
}

/**
 * Card de notificaciones push del dashboard admin. Muestra cuántas personas
 * tienen las notificaciones activas y permite difundir a todas, además de
 * activar/desactivar este mismo dispositivo.
 */
export function PushTestCard() {
  const { supported, permission, isSubscribed, loading, subscribe, unsubscribe } =
    usePushNotifications();
  const [stats, setStats] = React.useState<PushStats | null>(null);

  const denied = permission === 'denied';

  // Carga el conteo; se refresca cuando cambia la suscripción de este dispositivo.
  React.useEffect(() => {
    let cancelled = false;
    clientFetch<PushStats>('/api/push/stats')
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isSubscribed]);

  return (
    <section className="rounded-[22px] border border-primary/20 bg-primary/[0.04] p-6 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-primary/15 text-primary">
            {isSubscribed ? <BellRing className="size-5" /> : <Bell className="size-5" />}
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary sm:text-[11px]">
              Notificaciones push
            </p>
            <p className="mt-1 flex items-baseline gap-1.5 text-2xl font-bold leading-none">
              {stats ? (
                <>
                  {stats.people.toLocaleString('es-MX')}
                  <span className="text-sm font-medium text-muted-foreground">
                    {stats.people === 1 ? 'persona suscrita' : 'personas suscritas'}
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-2 text-base font-medium text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Cargando…
                </span>
              )}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              {stats ? `${stats.devices} ${stats.devices === 1 ? 'dispositivo' : 'dispositivos'} en total · ` : ''}
              Este dispositivo {isSubscribed ? 'está suscrito' : 'no está suscrito'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <PushBroadcastDialog />
          {!isSubscribed ? (
            <button
              type="button"
              onClick={subscribe}
              disabled={loading || !supported || denied}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(168,85,247,0.35)] transition hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}
              Activar en este dispositivo
            </button>
          ) : (
            <button
              type="button"
              onClick={unsubscribe}
              disabled={loading}
              className="rounded-xl px-3 py-2.5 text-xs font-medium text-white/55 transition hover:text-white disabled:opacity-50"
            >
              Desactivar
            </button>
          )}
        </div>
      </div>

      {!supported ? (
        <p className="mt-4 border-t border-primary/15 pt-4 text-[11px] leading-relaxed text-white/45">
          Este navegador no soporta push, o la página corre sin HTTPS / sin
          service worker (ej. en `pnpm dev`). Prueba en el deploy.
        </p>
      ) : denied ? (
        <p className="mt-4 border-t border-primary/15 pt-4 text-[11px] leading-relaxed text-amber-300/80">
          Bloqueaste las notificaciones en el navegador. Habilítalas desde los
          ajustes del sitio para reactivarlas.
        </p>
      ) : null}
    </section>
  );
}
