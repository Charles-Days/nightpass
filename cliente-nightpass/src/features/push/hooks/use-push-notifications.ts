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

/** ¿La suscripción local fue creada con la VAPID key que usamos hoy? */
function matchesVapidKey(sub: PushSubscription, vapidKey: string): boolean {
  const current = sub.options.applicationServerKey;
  if (!current) return false;
  const a = new Uint8Array(current as ArrayBuffer);
  const b = urlBase64ToUint8Array(vapidKey);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

type PermissionState = NotificationPermission | 'unsupported';

const vapidKey = clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

const supported =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window &&
  !!vapidKey;

// --- Store a nivel de módulo -------------------------------------------------
// El estado de permiso/suscripción es ÚNICO en la app, no por-componente. Antes
// cada `usePushNotifications()` tenía su propio useState aislado: al activar las
// notificaciones desde el banner (o el modal), el toggle de Ajustes y el resto
// de consumidores se quedaban con su copia vieja ('default') hasta reabrir la
// app. Con un store compartido + useSyncExternalStore, un solo `subscribe()`
// re-renderiza a TODOS los componentes que leen este estado.
interface PushState {
  permission: PermissionState;
  isSubscribed: boolean;
  loading: boolean;
  checked: boolean;
}

let state: PushState = {
  permission: supported ? 'default' : 'unsupported',
  isSubscribed: false,
  loading: false,
  checked: false,
};

const serverSnapshot: PushState = {
  permission: 'default',
  isSubscribed: false,
  loading: false,
  checked: false,
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function setState(patch: Partial<PushState>) {
  state = { ...state, ...patch };
  emit();
}

function subscribeStore(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return serverSnapshot;
}

// Init único (no por-componente). Siembra el permiso real, resincroniza la
// suscripción con el backend y escucha cambios de permiso (ej. el usuario lo
// concede/revoca desde la config del navegador) para no quedarse stale.
let initStarted = false;

function ensureInit() {
  if (initStarted) return;
  initStarted = true;

  if (!supported || !vapidKey) {
    setState({ permission: 'unsupported', checked: true });
    return;
  }

  setState({ permission: Notification.permission });

  // Propaga cambios de permiso hechos fuera de la app (config del navegador).
  navigator.permissions
    ?.query({ name: 'notifications' as PermissionName })
    .then((status) => {
      status.onchange = () => {
        setState({ permission: Notification.permission });
      };
    })
    .catch(() => undefined);

  void (async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (!sub) {
        setState({ isSubscribed: false });
        return;
      }

      // Suscripción vieja creada con otra VAPID key (deploy previo). El push
      // nunca llegaría → la tiramos para que el usuario re-active limpio.
      if (!matchesVapidKey(sub, vapidKey)) {
        await sub.unsubscribe().catch(() => undefined);
        setState({ isSubscribed: false });
        return;
      }

      // Sub local válida: re-registrarla en el backend (upsert idempotente).
      // Cubre el caso "el navegador la tiene pero la BD no" → delivered: 0.
      await clientFetch('/api/push/subscribe', {
        method: 'POST',
        body: sub.toJSON(),
      }).catch(() => undefined);
      setState({ isSubscribed: true });
    } catch {
      setState({ isSubscribed: false });
    } finally {
      setState({ checked: true });
    }
  })();
}

async function subscribeAction() {
  if (!supported || !vapidKey) return;
  setState({ loading: true });
  try {
    const perm = await Notification.requestPermission();
    setState({ permission: perm });
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
    setState({ isSubscribed: true });
    toast.success('Notificaciones activadas');
  } catch (err) {
    if (err instanceof ClientApiError) {
      toast.error('No pudimos registrar la suscripción');
    } else {
      toast.error('No pudimos activar las notificaciones');
    }
  } finally {
    setState({ loading: false });
  }
}

async function unsubscribeAction() {
  if (!supported) return;
  setState({ loading: true });
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
    setState({ isSubscribed: false });
    toast.success('Notificaciones desactivadas');
  } catch {
    toast.error('No pudimos desactivar las notificaciones');
  } finally {
    setState({ loading: false });
  }
}

async function sendTestAction() {
  try {
    await clientFetch('/api/push/test', { method: 'POST' });
    toast.message('Notificación de prueba enviada');
  } catch {
    toast.error('No pudimos enviar la prueba');
  }
}

export function usePushNotifications() {
  const snapshot = React.useSyncExternalStore(
    subscribeStore,
    getSnapshot,
    getServerSnapshot,
  );

  React.useEffect(() => {
    ensureInit();
  }, []);

  return {
    supported,
    checked: snapshot.checked,
    permission: snapshot.permission,
    isSubscribed: snapshot.isSubscribed,
    loading: snapshot.loading,
    subscribe: subscribeAction,
    unsubscribe: unsubscribeAction,
    sendTest: sendTestAction,
  };
}
