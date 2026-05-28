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
