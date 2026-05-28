'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { paths } from '@/core/config/paths';

export default function CustomerAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[customer-app/error]', error);
    }
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-5 text-center">
      <div className="grid size-14 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
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
          className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.08] active:scale-95"
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
