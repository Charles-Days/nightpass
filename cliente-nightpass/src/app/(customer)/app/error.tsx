'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { paths } from '@/core/config/paths';

// Errores típicos cuando el bundle del browser quedó stale tras un re-deploy:
// el servidor ya no conoce las Server Action IDs ni los chunks /_next/static
// que el cliente cacheó vía Service Worker. La recuperación correcta es
// limpiar caches + SW y recargar — el reset() de Next solo re-renderiza con
// los mismos chunks rotos.
const STALE_PATTERNS = [
  /failed to find server action/i,
  /deployment/i,
  /loading chunk \d+ failed/i,
  /ChunkLoadError/i,
];

function isStaleDeployError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return STALE_PATTERNS.some((re) => re.test(msg));
}

async function nukeClientCaches(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => undefined)));
    }
  } catch {
    // ignore
  }
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => undefined)));
    }
  } catch {
    // ignore
  }
}

export default function CustomerAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[customer-app/error]', error);
    }
    if (isStaleDeployError(error)) {
      setRecovering(true);
      nukeClientCaches().finally(() => {
        // Hard reload to fetch fresh chunks. Cache buster prevents BFCache reuse.
        window.location.replace(window.location.pathname + window.location.search);
      });
    }
  }, [error]);

  if (recovering) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-5 text-center">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">
          Actualizando la app a la versión más nueva…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-5 text-center">
      <div className="grid size-14 place-items-center rounded-full border border-white/14 bg-white/[0.07]">
        <AlertCircle className="size-6 text-primary" />
      </div>
      <h1 className="mt-5 font-display text-xl font-bold tracking-tight">
        Algo salió mal
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        No pudimos cargar esta sección. Volvé a intentarlo en un momento.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)] transition hover:brightness-110 active:scale-95"
        >
          <RefreshCw className="size-4" />
          Reintentar
        </button>
        <Link
          href={paths.appHome}
          className="inline-flex items-center rounded-full border border-white/14 bg-white/[0.07] px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.11] active:scale-95"
        >
          Ir al inicio
        </Link>
      </div>
      {error.digest && (
        <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-white/30">
          ref: {error.digest}
        </p>
      )}
    </div>
  );
}
