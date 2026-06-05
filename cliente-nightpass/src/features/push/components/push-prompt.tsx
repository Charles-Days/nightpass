'use client';

import * as React from 'react';
import { Bell, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { Button } from '@/core/components/ui/button';
import { usePushNotifications } from '../hooks/use-push-notifications';

const SESSION_KEY = 'np-push-prompt-shown';

/**
 * Modal que salta solo al abrir la app para pedir activar las notificaciones
 * cuando el usuario aún no las tiene. Más visible que el banner (la gente no
 * lo veía). Se muestra una vez por sesión hasta que active o cierre; nunca si
 * ya está suscrito, si lo bloqueó, o si el navegador no soporta push.
 */
export function PushPrompt() {
  const { supported, permission, isSubscribed, loading, subscribe } =
    usePushNotifications();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!supported || isSubscribed || permission !== 'default') return;
    if (sessionStorage.getItem(SESSION_KEY) === '1') return;

    // Espera a que el hook resuelva el estado real (getSubscription es async)
    // antes de abrir, para no parpadear ante usuarios ya suscritos.
    const t = setTimeout(() => {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
      sessionStorage.setItem(SESSION_KEY, '1');
      setOpen(true);
    }, 1500);
    return () => clearTimeout(t);
  }, [supported, isSubscribed, permission]);

  // Si se suscribe (desde aquí o el banner), cerrar.
  React.useEffect(() => {
    if (isSubscribed) setOpen(false);
  }, [isSubscribed]);

  const onActivate = async () => {
    await subscribe();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Bell className="size-7" />
          </div>
          <DialogTitle className="text-center text-xl">
            No te pierdas nada
          </DialogTitle>
          <DialogDescription className="text-center">
            Activa las notificaciones y entérate al instante de nuevos eventos,
            ventas y tus pases. Puedes desactivarlas cuando quieras.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-2">
          <Button
            type="button"
            onClick={onActivate}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#9333ea] to-[#a855f7] py-5 text-base font-semibold text-white"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : <Bell className="size-5" />}
            Activar notificaciones
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="w-full rounded-xl text-muted-foreground hover:text-foreground"
          >
            Ahora no
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
