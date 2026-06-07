import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowLeft,
  Gift,
  Mail,
  MapPin,
  Settings,
  Sparkles,
  Star,
  Ticket,
  TicketCheck,
} from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { User } from '@/core/types/api';
import { LoyaltyCard } from '@/features/loyalty';
import { InviteDialog } from '@/features/invite';

export const metadata = {
  title: 'Mi perfil — NightPass',
};

function getInitial(user: User) {
  return (user.name?.trim() || user.email).charAt(0).toUpperCase() || 'N';
}

function getFirstName(user: User) {
  const name = user.name?.trim();
  if (!name) return null;
  return name.split(/\s+/)[0];
}

function formatMemberSince(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  return `${months[d.getMonth()]} · ${d.getFullYear()}`;
}

function makeSerial(userId: string) {
  const tail = userId.replace(/-/g, '').slice(-5).toUpperCase();
  const year = new Date().getFullYear();
  return `NP-${year}-${tail}`;
}

export default async function PerfilPage() {
  let user: User;
  try {
    user = await serverFetch<User>('/auth/me');
  } catch (error) {
    // 401/403 = cookie inválida → login. 5xx/network = backend caído → dejar
    // que el error.tsx renderee fallback; redirigir a login en ese caso
    // confunde al usuario (no es un problema de auth).
    if (error instanceof ServerApiError && (error.status === 401 || error.status === 403)) {
      redirect(paths.iniciarSesion);
    }
    throw error;
  }

  const isCustomer = user.role === 'CUSTOMER';
  const firstName = getFirstName(user) ?? 'Insider';
  const memberSince = formatMemberSince(user.createdAt);
  const serial = makeSerial(user.id);
  const isInsider = user.role === 'CUSTOMER';

  // TODO Fase 4/5: conectar a backend cuando existan endpoints /me/stats, /me/recent-activity, /me/next-pass
  const stats = {
    pases: '—',
    noches: '—',
    bares: '—',
    ahorrado: '—',
  };
  type RecentActivityItem = { date: string; venue: string; note: string };
  type NextPass = { venue: string; city: string; time: string; serial: string; price: string };
  const recentActivity: RecentActivityItem[] = [];
  const nextPass = null as NextPass | null;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-10">
      <Link
        href={paths.appHome}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground active:scale-95 transform-gpu"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>

      <section className="mt-6 np-rise">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Mi cuenta
        </p>
        <div className="mt-3 flex items-start justify-between gap-3">
          <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-[-0.035em] sm:text-5xl">
            Hola, {firstName}.
          </h1>
          <Link
            href={paths.ajustes}
            aria-label="Ajustes"
            title="Ajustes"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/[0.05] text-foreground transition active:scale-95 hover:bg-white/[0.09]"
          >
            <Settings className="size-5" />
          </Link>
        </div>
      </section>

      {/* MEMBERSHIP CARD */}
      <section
        className="relative mt-8 overflow-hidden rounded-[24px] border border-primary/25 bg-gradient-to-br from-[#1a0b2e] to-[#0f0820] p-6 shadow-[0_30px_80px_-20px_rgba(168,85,247,0.35)] np-rise transform-gpu sm:p-9"
        style={{ animationDelay: '80ms' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 size-[360px] rounded-full opacity-50 blur-[80px]"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -left-16 size-[320px] rounded-full opacity-30 blur-[90px]"
          style={{ background: 'radial-gradient(circle, #ec4899, transparent 70%)' }}
        />

        <div className="relative grid items-center gap-8 sm:grid-cols-[1.4fr_1fr]">
          <div className="min-w-0">
            {isInsider && (
              <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-amber-300/35 bg-amber-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                <Star className="size-3 fill-current" />
                Insider
              </span>
            )}
            <h2 className="font-display text-2xl font-bold tracking-[-0.025em] sm:text-[34px]">
              {user.name?.trim() || 'NightPass member'}
            </h2>
            <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs tracking-wider text-white/55">
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{user.email}</span>
            </p>
            <div className="mt-6 flex flex-wrap gap-7 border-t border-white/14 pt-5">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                  Miembro desde
                </p>
                <p className="mt-1.5 font-mono text-[13px] tracking-wider">{memberSince}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                  Nº Serie
                </p>
                <p className="mt-1.5 font-mono text-[13px] tracking-wider">{serial}</p>
              </div>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div
              aria-hidden
              className="absolute size-60 rounded-full opacity-50 blur-3xl"
              style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }}
            />
            <div className="relative grid size-32 place-items-center rounded-full bg-gradient-to-br from-[#a855f7] via-[#9333ea] to-[#ec4899] font-display text-[64px] font-bold leading-none text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.12),0_20px_50px_-10px_rgba(168,85,247,0.6)] ring-2 ring-white/14 np-pop-in transform-gpu sm:size-40 sm:text-[80px]">
              {getInitial(user)}
            </div>
          </div>
        </div>
      </section>

      {/* LOYALTY CARD — NPP, tier, streak, progress */}
      {isCustomer ? (
        <section className="mt-5">
          <LoyaltyCard />
        </section>
      ) : null}

      {/* INVITA Y GANA NPP */}
      {isCustomer ? (
        <section className="mt-5">
          <InviteDialog>
            <button
              type="button"
              className="group flex w-full items-center gap-3.5 rounded-[18px] border border-primary/25 bg-primary/[0.06] px-5 py-4 text-left transition-all hover:bg-primary/[0.1] active:scale-[0.99] transform-gpu"
            >
              <span className="grid size-10 place-items-center rounded-[12px] bg-primary/15 text-primary">
                <Gift className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Invita y gana NPP</p>
                <p className="text-[11px] text-muted-foreground">
                  Comparte tu link y suma puntos por cada amigo
                </p>
              </div>
              <Gift className="size-4 shrink-0 text-primary/60 transition group-hover:scale-110" />
            </button>
          </InviteDialog>
        </section>
      ) : null}

      {/* STATS GRID */}
      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: stats.pases, l: 'Pases comprados', icon: Ticket },
          { k: stats.noches, l: 'Noches', icon: Sparkles },
          { k: stats.bares, l: 'Bares visitados', icon: MapPin },
          { k: stats.ahorrado === '—' ? '—' : `S/ ${stats.ahorrado}`, l: 'Ahorrado en filas', icon: TicketCheck },
        ].map((s, i) => (
          <div
            key={s.l}
            className="rounded-[18px] border border-white/14 bg-white/[0.05] p-5 transition-colors hover:bg-white/[0.07] np-rise transform-gpu"
            style={{ animationDelay: `${160 + i * 60}ms` }}
          >
            <div className="mb-4 flex items-start justify-between">
              <s.icon className="size-5 text-primary" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                Total
              </span>
            </div>
            <p className="font-display text-3xl font-bold leading-none tracking-[-0.03em] sm:text-4xl">
              {s.k}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </section>

      {/* UPCOMING PASS + RECENT ACTIVITY */}
      <section className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-[20px] border border-primary/25 bg-primary/[0.08] p-6 np-rise transform-gpu sm:p-7" style={{ animationDelay: '440ms' }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Tu próximo pase
            </p>
            {nextPass && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Esta noche
              </span>
            )}
          </div>
          {nextPass ? (
            <>
              <div className="flex items-center gap-4">
                <div className="size-20 shrink-0 rounded-xl bg-gradient-to-br from-[#9333ea]/40 to-[#ec4899]/30" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xl font-bold tracking-[-0.02em]">
                    {nextPass.venue}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {nextPass.city} · {nextPass.time}
                  </p>
                  <p className="mt-1 font-mono text-[11px] tracking-wider text-white/40">
                    {nextPass.serial} · {nextPass.price}
                  </p>
                </div>
              </div>
              <Link
                href={paths.pases}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(168,85,247,0.55)] transition hover:opacity-95 active:scale-[0.98] transform-gpu"
              >
                Abrir mi pase QR →
              </Link>
            </>
          ) : (
            <div className="flex flex-col items-start gap-3 py-2">
              <p className="text-sm text-white/70">No tienes pases activos.</p>
              <Link
                href={paths.eventos}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(168,85,247,0.55)] transition hover:opacity-95 active:scale-95 transform-gpu"
              >
                Buscar eventos →
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-[20px] border border-white/14 bg-white/[0.05] p-6 np-rise transform-gpu sm:p-7" style={{ animationDelay: '500ms' }}>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Actividad reciente
          </p>
          {recentActivity.length > 0 ? (
            <ul>
              {recentActivity.map((a, i, arr) => (
                <li
                  key={`${a.date}-${i}`}
                  className={`flex items-center justify-between py-3 ${i < arr.length - 1 ? 'border-b border-white/10' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-11 font-mono text-[10px] tracking-wider text-white/35">
                      {a.date}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{a.venue}</p>
                      <p className="text-[11px] text-muted-foreground">{a.note}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-300">
                    Visitado
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid place-items-center py-6 text-center">
              <p className="text-sm text-white/55">Tu actividad aparecerá aquí.</p>
              <p className="mt-1 text-[11px] text-white/35">
                Compra tu primer pase para empezar.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Acceso a configuración (además del engrane del header) */}
      <section className="mt-8">
        <Link
          href={paths.ajustes}
          className="group flex items-center gap-3.5 rounded-[16px] border border-white/14 bg-white/[0.05] px-5 py-4 transition-all hover:bg-white/[0.07] hover:border-white/18 active:scale-[0.99] transform-gpu"
        >
          <span className="grid size-10 place-items-center rounded-[12px] bg-primary/15 text-primary">
            <Settings className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Ajustes y privacidad</p>
            <p className="text-[11px] text-muted-foreground">
              Ubicación, notificaciones{isCustomer ? ', ranking' : ''} y cuenta
            </p>
          </div>
          <ArrowLeft className="size-4 shrink-0 rotate-180 text-white/35 transition group-hover:translate-x-0.5 group-hover:text-foreground" />
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="mt-10 flex flex-col items-center gap-2 pb-6 text-center">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          NightPass
        </p>
        <p className="text-[11px] text-muted-foreground/70">v1.0.0</p>
      </footer>
    </div>
  );
}
