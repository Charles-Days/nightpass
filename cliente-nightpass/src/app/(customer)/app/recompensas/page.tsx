import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, QrCode } from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { User } from '@/core/types/api';
import {
  HistoryList,
  LeaderboardTable,
  LoyaltyCard,
  TIER_ORDER,
  TIER_STYLES,
  TierBadge,
} from '@/features/loyalty';

export const metadata = {
  title: 'Recompensas — NightPass',
};

const DEFAULT_CITY = 'Cuernavaca';

export default async function RecompensasPage() {
  let user: User;
  try {
    user = await serverFetch<User>('/auth/me');
  } catch (error) {
    // 401/403 → login. Red caída o 5xx → tampoco podemos pintar la página
    // (necesita user.id para el leaderboard); mandamos al login en lugar de 500.
    if (error instanceof ServerApiError) {
      if (error.status === 401 || error.status === 403 || error.isNetwork || error.status >= 500) {
        redirect(paths.iniciarSesion);
      }
    }
    throw error;
  }

  // City fallback: hardcoded for MVP. Backend will eventually attach the
  // user's primary city to /auth/me.
  const userCity =
    (user as User & { primaryCity?: string | null }).primaryCity ?? DEFAULT_CITY;

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
          Suma puntos NightPass cada vez que vas a un bar. Sube de tier para
          desbloquear eventos exclusivos.
        </p>
      </section>

      <section className="np-rise mt-8" style={{ animationDelay: '240ms' }}>
        <LoyaltyCard variant="hero" />
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

      {/* Perks por tier */}
      <section className="np-rise mt-10" style={{ animationDelay: '360ms' }}>
        <h2 className="mb-4 font-display text-xl font-bold tracking-tight">
          Tiers y beneficios
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TIER_ORDER.map((tier, i) => {
            const style = TIER_STYLES[tier];
            return (
              <div
                key={tier}
                className="np-rise relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025] p-5 transform-gpu transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.04] hover:shadow-[0_18px_40px_-20px_rgba(168,85,247,0.4)]"
                style={{ animationDelay: `${420 + i * 70}ms` }}
              >
                <TierBadge tier={tier} size="sm" />
                <h3 className="mt-3 font-display text-lg font-bold tracking-tight">
                  {style.label}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {style.description}
                </p>
                <p className="mt-3 text-[11px] leading-relaxed text-white/55">
                  {style.perk}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="np-rise mt-10" style={{ animationDelay: '700ms' }}>
        <h2 className="mb-4 font-display text-xl font-bold tracking-tight">
          Actividad reciente
        </h2>
        <HistoryList limit={30} />
      </section>

      <section className="np-rise mt-10" style={{ animationDelay: '760ms' }}>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight">
            Top Insiders en {userCity}
          </h2>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Último año
          </span>
        </div>
        <LeaderboardTable city={userCity} currentUserId={user.id} />
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
