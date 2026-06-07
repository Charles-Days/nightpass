import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  KeyRound,
  MapPin,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Ticket,
} from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { User } from '@/core/types/api';
import { LocationPermissionStatus } from '@/features/geolocation';
import { NotificationsToggle } from '@/features/push';
import { LogoutButton } from './_components/logout-button';
import { RankingPreferences } from './_components/ranking-preferences';

export const metadata = {
  title: 'Ajustes — NightPass',
};

export default async function AjustesPage() {
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
    <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8 sm:py-10">
      <Link
        href={paths.perfil}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground active:scale-95 transform-gpu"
      >
        <ArrowLeft className="size-4" />
        Mi perfil
      </Link>

      <section className="mt-6 np-rise">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Preferencias
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-[1.05] tracking-[-0.035em] sm:text-4xl">
          Ajustes
        </h1>
      </section>

      {/* UBICACION */}
      <section id="ubicacion" className="mt-8 scroll-mt-24 np-rise" style={{ animationDelay: '60ms' }}>
        <h3 className="mb-3 flex items-center gap-1.5 px-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          <MapPin className="size-3 text-primary" />
          Ubicación
        </h3>
        <LocationPermissionStatus />
        <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted-foreground">
          Borramos pings automáticamente cada 24h. Puedes borrar todo ahora.{' '}
          <Link href="/privacidad" className="text-primary underline-offset-2 hover:underline">
            Política de privacidad
          </Link>
          .
        </p>
      </section>

      {/* NOTIFICACIONES */}
      <section className="mt-8 np-rise" style={{ animationDelay: '120ms' }}>
        <h3 className="mb-3 flex items-center gap-1.5 px-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          <Bell className="size-3 text-primary" />
          Notificaciones
        </h3>
        <NotificationsToggle />
      </section>

      {/* RANKING */}
      {isCustomer ? (
        <section className="mt-8 np-rise" style={{ animationDelay: '180ms' }}>
          <h3 className="mb-3 px-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Ranking
          </h3>
          <RankingPreferences
            initialState={user.state}
            initialCity={user.city}
            initialRankingOptIn={user.rankingOptIn}
          />
        </section>
      ) : null}

      {/* CUENTA */}
      <section className="mt-8 np-rise" style={{ animationDelay: '240ms' }}>
        <h3 className="mb-3 px-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Cuenta
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingItem icon={Ticket} title="Mis pases" desc="Tus pases activos" href={paths.pases} />
          <SettingItem icon={ShoppingBag} title="Compras" desc="Historial de pagos" href={paths.compras} />
          <SettingItem icon={Shield} title="Privacidad" desc="Permisos y datos" href="/privacidad" />
          {!isCustomer && (
            <SettingItem
              icon={KeyRound}
              title="Cambiar contraseña"
              desc="Seguridad de la cuenta"
              href={paths.cambiarPassword}
            />
          )}
          {!isCustomer && (
            <SettingItem
              icon={ShieldCheck}
              title="Panel admin"
              desc="Ir al dashboard"
              href={paths.dashboard}
            />
          )}
        </div>
      </section>

      {/* LOGOUT */}
      <section className="mt-8 np-rise" style={{ animationDelay: '300ms' }}>
        <div className="overflow-hidden rounded-[22px] border border-white/14 bg-white/[0.05] p-2">
          <LogoutButton />
        </div>
      </section>

      {/* FOOTER */}
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

interface SettingItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  href?: string;
}

function SettingItem({ icon: Icon, title, desc, href }: SettingItemProps) {
  const inner = (
    <>
      <span className="grid size-9 place-items-center rounded-[10px] bg-primary/15 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-white/35 transition group-hover:translate-x-0.5 group-hover:text-foreground" />
    </>
  );

  const className =
    'group flex items-center gap-3.5 rounded-[14px] border border-white/14 bg-white/[0.05] px-4 py-3.5 transition-all hover:bg-white/[0.07] hover:border-white/18 active:scale-[0.98] transform-gpu';

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={className + ' opacity-70'} aria-disabled>
      {inner}
    </div>
  );
}
