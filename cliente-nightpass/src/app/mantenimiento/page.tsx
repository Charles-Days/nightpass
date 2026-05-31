import { Loader2, Wrench } from 'lucide-react';
import { MaintenanceRefresher } from './maintenance-refresher';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Estamos actualizando — NightPass',
  robots: { index: false },
};

const DEFAULT_MESSAGE =
  'Estamos haciendo mejoras en NightPass. Volvemos en unos minutos — gracias por tu paciencia.';

async function getMessage(): Promise<string> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:7101';
  try {
    const res = await fetch(`${apiUrl}/api/v1/maintenance`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = (await res.json()) as { message?: string | null };
      if (data.message) return data.message;
    }
  } catch {
    // backend caído → mensaje genérico
  }
  return DEFAULT_MESSAGE;
}

export default async function MaintenancePage() {
  const message = await getMessage();

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0A0A0F] px-6 text-center">
      {/* Bokeh background — mismo lenguaje que el landing */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/4 size-[28rem] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.18),transparent_70%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-1/4 size-[24rem] rounded-full bg-[radial-gradient(circle,rgba(147,51,234,0.16),transparent_70%)] blur-3xl"
      />

      <div className="relative z-10 flex max-w-md flex-col items-center">
        <span className="grid size-16 place-items-center rounded-2xl border border-primary/30 bg-primary/15 backdrop-blur-xl">
          <Wrench className="size-7 text-primary" />
        </span>

        <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          NightPass
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Estamos actualizando
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/60">{message}</p>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/70">
          <Loader2 className="size-3.5 animate-spin text-primary" />
          Reintentando automáticamente…
        </div>
      </div>

      <MaintenanceRefresher />
    </main>
  );
}
