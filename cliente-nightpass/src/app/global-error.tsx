'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0A0A0F] px-6 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-1/4 size-[28rem] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.16),transparent_70%)] blur-3xl"
        />
        <div className="relative z-10 flex max-w-md flex-col items-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-purple-400">
            NightPass
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Algo salió mal
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            Tuvimos un problema inesperado. Puedes reintentar — si el problema
            sigue, vuelve en unos minutos.
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-[11px] text-white/30">
              ref: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            className="mt-7 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
