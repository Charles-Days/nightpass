'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import { clientEnv } from '@/core/config/env';

/** VAPID base64url → Uint8Array, requerido por pushManager.subscribe. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

type PermissionState = NotificationPermission | 'unsupported';

export function usePushNotifications() {
  const [permission, setPermission] = React.useState<PermissionState>('default');
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const vapidKey = clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    !!vapidKey;

  // Estado inicial: ¿ya está suscrito?
  React.useEffect(() => {
    if (!supported) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(!!sub))
      .catch(() => undefined);
  }, [supported]);

  const subscribe = React.useCallback(async () => {
    if (!supported || !vapidKey) return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        toast.error('Activa las notificaciones en el navegador para continuar');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      await clientFetch('/api/push/subscribe', { method: 'POST', body: sub.toJSON() });
      setIsSubscribed(true);
      toast.success('Notificaciones activadas');
    } catch (err) {
      if (err instanceof ClientApiError) {
        toast.error('No pudimos registrar la suscripción');
      } else {
        toast.error('No pudimos activar las notificaciones');
      }
    } finally {
      setLoading(false);
    }
  }, [supported, vapidKey]);

  const unsubscribe = React.useCallback(async () => {
    if (!supported) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await clientFetch('/api/push/unsubscribe', {
          method: 'POST',
          body: { endpoint: sub.endpoint },
        }).catch(() => undefined);
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      toast.success('Notificaciones desactivadas');
    } catch {
      toast.error('No pudimos desactivar las notificaciones');
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const sendTest = React.useCallback(async () => {
    try {
      await clientFetch('/api/push/test', { method: 'POST' });
      toast.message('Notificación de prueba enviada');
    } catch {
      toast.error('No pudimos enviar la prueba');
    }
  }, []);

  return { supported, permission, isSubscribed, loading, subscribe, unsubscribe, sendTest };
}
