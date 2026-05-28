import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, QrCode } from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import { HistoryList, LoyaltyCard } from '@/features/loyalty';

export const metadata = {
  title: 'Recompensas — NightPass',
};

export default async function RecompensasPage() {
  try {
    await serverFetch('/auth/me');
  } catch (error) {
    // 401/403 = cookie inválida → login. 5xx/network = backend caído → dejar
    // que el error.tsx renderee fallback; redirigir a login en ese caso
    // confunde al usuario (no es un problema de auth).
    if (error instanceof ServerApiError && (error.status === 401 || error.status === 403)) {
      redirect(paths.iniciarSesion);
    }
    throw error;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8 sm:py-10">
      <Link
        href={paths.perfil}
        className="np-rise inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground active:scale-95 transform-gpu"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>

      <section className="mt-6">
        <p className="np-rise text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary" style={{ animationDelay: '60ms' }}>
          Tu progreso
        </p>
        <h1 className="np-rise mt-3 font-display text-3xl font-bold leading-[1.05] tracking-[-0.035em] sm:text-5xl" style={{ animationDelay: '120ms' }}>
          Recompensas
        </h1>
        <p className="np-rise mt-2 max-w-xl text-sm text-muted-foreground" style={{ animationDelay: '180ms' }}>
          Suma puntos NightPass cada vez que vas a un bar.
        </p>
      </section>

      <section className="np-rise mt-8" style={{ animationDelay: '240ms' }}>
        <LoyaltyCard variant="hero" hideTierNames />
      </section>

      <section className="np-rise mt-6 flex flex-wrap gap-3" style={{ animationDelay: '300ms' }}>
        <Link
          href={paths.recompensasScan}
          className="np-glow-pulse inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(168,85,247,0.55)] transform-gpu transition active:scale-95 hover:brightness-110 sm:flex-none"
        >
          <QrCode className="size-4" />
          Escanear QR del bar
        </Link>
      </section>

      <section className="np-rise mt-10" style={{ animationDelay: '700ms' }}>
        <h2 className="mb-4 font-display text-xl font-bold tracking-tight">
          Actividad reciente
        </h2>
        <HistoryList limit={30} />
      </section>

      <section className="np-rise mt-10 rounded-[22px] border border-white/10 bg-white/[0.025] p-6 sm:p-7" style={{ animationDelay: '820ms' }}>
        <h3 className="font-display text-lg font-bold tracking-tight">
          ¿Cómo gano puntos?
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-white/75">
          <li>
            <span className="font-semibold text-foreground">+25 NPP</span> cuando
            el staff escanea tu pase al entrar a un evento.
          </li>
          <li>
            <span className="font-semibold text-foreground">+10 NPP</span> al
            escanear el QR del bar (máximo una vez al día por bar).
          </li>
          <li>
            <span className="font-semibold text-foreground">+15 NPP</span> de
            bonus la primera vez que visitas un bar.
          </li>
          <li>
            <span className="font-semibold text-foreground">+5 NPP</span> por
            cada día consecutivo de racha. Hitos en 7, 30, 100 y 365 días.
          </li>
        </ul>
      </section>
    </div>
  );
}
