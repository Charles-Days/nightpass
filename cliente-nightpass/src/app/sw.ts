/// <reference lib="webworker" />

import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkOnly, Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // Rutas vivas: API, proxy backend y todo /app/* (auth-gated, cacheable
      // ofreceria HTML stale o 5xx). Sin esto Serwist NetworkFirst guarda
      // respuestas 500 y las replayea hasta la siguiente revalidacion.
      matcher: ({ url, request }) =>
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/backend/') ||
        url.pathname.startsWith('/app/') ||
        url.pathname === '/app' ||
        request.headers.get('rsc') === '1' ||
        request.headers.get('next-router-prefetch') === '1',
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// ───────────────────────── Web Push ─────────────────────────
// Payload enviado por el backend (PushService.PushPayload).
interface NpPushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: NpPushPayload;
  try {
    payload = event.data.json() as NpPushPayload;
  } catch {
    payload = { title: 'NightPass', body: event.data.text() };
  }

  const url = payload.url ?? '/';
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon ?? '/icons/icon-192.png',
      badge: payload.badge ?? '/icons/icon-192.png',
      tag: payload.tag,
      data: { ...payload.data, url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data as { url?: string } | undefined)?.url ?? '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana de la app abierta, enfocala y navega.
        for (const client of clientList) {
          if ('focus' in client) {
            void client.focus();
            if ('navigate' in client) void client.navigate(targetUrl);
            return;
          }
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
