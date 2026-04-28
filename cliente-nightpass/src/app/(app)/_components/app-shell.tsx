'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LogOut,
  LayoutDashboard,
  Calendar,
  Ticket,
  Store,
  Users,
  Sparkles,
  Inbox,
  type LucideIcon,
} from 'lucide-react';
import { useLogout } from '@/features/auth';
import { Button } from '@/core/components/ui/button';
import { paths } from '@/core/config/paths';
import { clientEnv } from '@/core/config/env';
import type { Role, User } from '@/core/types/api';
import { cn } from '@/core/lib/utils/cn';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
  roles: Role[];
}

const PLATFORM_NAV: NavItem[] = [
  { href: paths.dashboard, label: 'Dashboard', icon: LayoutDashboard, enabled: true, roles: ['ADMIN'] },
  { href: paths.adminApplications, label: 'Solicitudes', icon: Inbox, enabled: true, roles: ['ADMIN'] },
  { href: paths.adminVenues, label: 'Locales', icon: Store, enabled: true, roles: ['ADMIN'] },
  { href: paths.adminUsers, label: 'Usuarios', icon: Users, enabled: true, roles: ['ADMIN'] },
  { href: '/admin/stories', label: 'Stories', icon: Sparkles, enabled: false, roles: ['ADMIN'] },
];

const VENUE_NAV: NavItem[] = [
  { href: paths.miLocal, label: 'Mi local', icon: Store, enabled: true, roles: ['VENUE_OWNER', 'VENUE_STAFF'] },
  { href: paths.miLocalEventos, label: 'Eventos', icon: Calendar, enabled: true, roles: ['VENUE_OWNER', 'VENUE_STAFF'] },
  { href: '/mi-local/pases', label: 'Pases', icon: Ticket, enabled: false, roles: ['VENUE_OWNER'] },
  { href: paths.miLocalStaff, label: 'Staff', icon: Users, enabled: true, roles: ['VENUE_OWNER'] },
];

function visibleFor(role: Role, group: NavItem[]): NavItem[] {
  return group.filter((item) => item.roles.includes(role));
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-primary/50">
        {title}
      </p>
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const base =
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors';
        if (!item.enabled) {
          return (
            <div
              key={item.href}
              className={cn(base, 'cursor-not-allowed text-muted-foreground/60')}
              title="Disponible pronto"
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
              <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                pronto
              </span>
            </div>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              base,
              active
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-white/[0.06] hover:text-accent-foreground',
            )}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Plataforma',
  VENUE_OWNER: 'Dueño de local',
  VENUE_STAFF: 'Staff de local',
  CUSTOMER: 'Cliente',
};

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const { mutate: logout, isPending } = useLogout();

  const platformItems = visibleFor(user.role, PLATFORM_NAV);
  const venueItems = visibleFor(user.role, VENUE_NAV);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Subtle bokeh background — same language as landing but dimmer */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80rem 60rem at 100% 0%, oklch(0.62 0.245 296.5 / 0.07) 0%, transparent 70%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60rem 50rem at 0% 100%, oklch(0.55 0.28 320 / 0.05) 0%, transparent 70%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50rem 40rem at 20% 40%, oklch(0.45 0.2 260 / 0.03) 0%, transparent 70%)' }} />
      </div>

      {/* Main grid — sits above bokeh */}
      <div className="relative z-10 grid min-h-screen" style={{ gridTemplateColumns: '260px 1fr' }}>
      <aside className="flex flex-col border-r border-white/8 bg-white/[0.03] backdrop-blur-xl px-4 py-6">
        <div className="mb-8 px-2">
          <span className="bg-gradient-to-r from-white to-purple-300 bg-clip-text font-display text-lg font-bold tracking-tight text-transparent">
            {clientEnv.NEXT_PUBLIC_APP_NAME}
          </span>
          <p className="text-xs text-primary/70 mt-0.5">Panel admin</p>
        </div>
        <nav className="flex-1 space-y-6">
          <NavSection title="Plataforma" items={platformItems} pathname={pathname} />
          <NavSection title="Mi local" items={venueItems} pathname={pathname} />
        </nav>
        <div className="border-t border-white/8 pt-4">
          <div className="mb-3 px-2">
            <p className="text-sm font-medium">{user.name ?? user.email}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-primary/80">
              {ROLE_LABEL[user.role]}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            disabled={isPending}
            onClick={() => logout()}
          >
            <LogOut className="size-4" />
            {isPending ? 'Cerrando...' : 'Cerrar sesion'}
          </Button>
        </div>
      </aside>
      <div className="flex flex-col overflow-hidden">
        {user.mustChangePassword ? (
          <div className="flex items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-6 py-2.5 text-sm text-amber-300">
            <span>Estás usando una contraseña temporal — cámbiala para mayor seguridad.</span>
            <Link href={paths.cambiarPassword} className="shrink-0 font-semibold underline hover:no-underline">
              Cambiar ahora
            </Link>
          </div>
        ) : null}
        <main className="flex-1 overflow-y-auto bg-transparent px-8 py-8">{children}</main>
      </div>
      </div>
    </div>
  );
}
