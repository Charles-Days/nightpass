import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Gift, QrCode } from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import { LoyaltyCard } from '@/features/loyalty';
import { InviteDialog } from '@/features/invite';
import type { User } from '@/core/types/api';
import { RewardsTabs } from './_components/rewards-tabs';

export const metadata = {
  title: 'Recompensas — NightPass',
};

export default async function RecompensasPage() {
  let me: User;
  try {
    me = await serverFetch<User>('/auth/me');
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

      <section className="np-rise mt-6 grid grid-cols-2 gap-3" style={{ animationDelay: '300ms' }}>
        <Link
          href={paths.recompensasScan}
          className="np-glow-pulse flex h-24 flex-col items-center justify-center gap-2 rounded-[20px] bg-gradient-to-br from-[#9333ea] to-[#a855f7] px-3 text-center text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(168,85,247,0.55)] transform-gpu transition active:scale-95 hover:brightness-110"
        >
          <QrCode className="size-6" />
          Escanear QR
        </Link>
        <InviteDialog>
          <button
            type="button"
            className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-[20px] border border-primary/30 bg-primary/10 px-3 text-center text-sm font-semibold text-primary transform-gpu transition active:scale-95 hover:bg-primary/15"
          >
            <Gift className="size-6" />
            Invita y gana
          </button>
        </InviteDialog>
      </section>

      <section className="np-rise mt-10" style={{ animationDelay: '560ms' }}>
        <RewardsTabs
          state={me.state}
          city={me.city}
          rankingOptIn={me.rankingOptIn}
          userId={me.id}
        />
      </section>
    </div>
  );
}
