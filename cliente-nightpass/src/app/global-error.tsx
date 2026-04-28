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
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center text-zinc-100">
        <h1 className="text-2xl font-semibold">Algo salio mal</h1>
        <p className="max-w-md text-sm text-zinc-400">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500"
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
