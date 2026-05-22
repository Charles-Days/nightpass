import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  KeyRound,
  Mail,
  ShieldCheck,
  Ticket,
  User as UserIcon,
} from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { Role, User } from '@/core/types/api';
import { LogoutButton } from './_components/logout-button';

export const metadata = {
  title: 'Mi perfil — NightPass',
};

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrador',
  VENUE_OWNER: 'Dueno de local',
  VENUE_STAFF: 'Staff de local',
  CUSTOMER: 'Insider',
};

function getInitial(user: User) {
  const source = user.name?.trim() || user.email;
  return source.charAt(0).toUpperCase() || 'N';
}

export default async function PerfilPage() {
  let user: User;
  try {
    user = await serverFetch<User>('/auth/me');
  } catch (error) {
    if (error instanceof ServerApiError && (error.status === 401 || error.status === 403)) {
      redirect(paths.iniciarSesion);
    }
    throw error;
  }

  const isCustomer = user.role === 'CUSTOMER';

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-6 sm:px-8 sm:py-10">
      <Link
        href={paths.home}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>

      {/* Header */}
      <section className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Mi cuenta
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-[1.05] tracking-[-0.02em] sm:text-4xl">
          Tu perfil
        </h1>
      </section>

      {/* Avatar card */}
      <section className="mt-6 rounded-[22px] border border-white/10 bg-white/[0.025] p-6 sm:p-7">
        <div className="flex items-center gap-4 sm:gap-5">
          <div
            className="relative grid size-20 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#9333ea] to-[#a855f7] shadow-[0_8px_32px_-8px_rgba(168,85,247,0.6)]"
            aria-hidden
          >
            <span className="font-display text-[32px] font-bold leading-none text-white">
              {getInitial(user)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-xl font-bold leading-tight tracking-tight sm:text-2xl">
              {user.name?.trim() || 'NightPass member'}
            </h2>
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{user.email}</span>
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
              <UserIcon className="size-3" />
              {ROLE_LABEL[user.role]}
            </span>
          </div>
        </div>
      </section>

      {/* Tu cuenta */}
      <section className="mt-8">
        <h3 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Tu cuenta
        </h3>
        <ul className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025]">
          <li>
            <Link
              href={paths.pases}
              className="group flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.04]"
            >
              <span className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-primary">
                <Ticket className="size-4" />
              </span>
              <span className="flex-1 text-sm font-medium">Mis pases</span>
              <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          </li>

          {!isCustomer && (
            <li className="border-t border-white/5">
              <Link
                href={paths.cambiarPassword}
                className="group flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.04]"
              >
                <span className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-primary">
                  <KeyRound className="size-4" />
                </span>
                <span className="flex-1 text-sm font-medium">Cambiar contrasena</span>
                <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            </li>
          )}

          {!isCustomer && (
            <li className="border-t border-white/5">
              <Link
                href={paths.dashboard}
                className="group flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.04]"
              >
                <span className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-primary">
                  <ShieldCheck className="size-4" />
                </span>
                <span className="flex-1 text-sm font-medium">Ir al panel admin</span>
                <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            </li>
          )}
        </ul>
      </section>

      {/* Sesion */}
      <section className="mt-6">
        <h3 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Sesion
        </h3>
        <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025] p-2">
          <LogoutButton />
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-10 flex flex-col items-center gap-2 pb-6 text-center">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          NightPass
        </p>
        <p className="text-[11px] text-muted-foreground/70">v1.0.0</p>
        <button
          type="button"
          className="mt-2 text-xs text-muted-foreground transition hover:text-primary"
        >
          Soporte
        </button>
      </footer>
    </div>
  );
}
