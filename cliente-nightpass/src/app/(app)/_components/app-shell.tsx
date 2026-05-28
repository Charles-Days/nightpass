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
  QrCode,
  CreditCard,
  Menu,
  Pencil,
  Radio,
  type LucideIcon,
} from 'lucide-react';
import { useLogout } from '@/features/auth';
import { Button } from '@/core/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/core/components/ui/sheet';
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
  { href: paths.adminOrganizadores, label: 'Organizadores', icon: Sparkles, enabled: true, roles: ['ADMIN'] },
  { href: paths.adminUsers, label: 'Usuarios', icon: Users, enabled: true, roles: ['ADMIN'] },
  { href: paths.adminStories, label: 'Historias', icon: Radio, enabled: true, roles: ['ADMIN'] },
];

const VENUE_NAV: NavItem[] = [
  { href: paths.miLocal, label: 'Mi local', icon: Store, enabled: true, roles: ['VENUE_OWNER', 'VENUE_STAFF'] },
  { href: paths.miLocalEditar, label: 'Editar local', icon: Pencil, enabled: true, roles: ['VENUE_OWNER'] },
  { href: paths.miLocalEventos, label: 'Eventos', icon: Calendar, enabled: true, roles: ['VENUE_OWNER', 'VENUE_STAFF'] },
  { href: paths.scanner, label: 'Escanear pase', icon: QrCode, enabled: true, roles: ['VENUE_OWNER', 'VENUE_STAFF', 'ADMIN'] },
  { href: paths.miLocalPagos, label: 'Pagos', icon: CreditCard, enabled: true, roles: ['VENUE_OWNER'] },
  { href: paths.miLocalPases, label: 'Pases', icon: Ticket, enabled: true, roles: ['VENUE_OWNER'] },
  { href: paths.miLocalStories, label: 'Historias', icon: Radio, enabled: true, roles: ['VENUE_OWNER', 'VENUE_STAFF'] },
  { href: paths.miLocalStaff, label: 'Staff', icon: Users, enabled: true, roles: ['VENUE_OWNER'] },
];

const PROMOTER_NAV: NavItem[] = [
  { href: paths.miOrganizador, label: 'Mi panel', icon: Sparkles, enabled: true, roles: ['PROMOTER', 'PROMOTER_STAFF'] },
  { href: paths.miOrganizadorEditar, label: 'Editar perfil', icon: Pencil, enabled: true, roles: ['PROMOTER'] },
  { href: paths.miOrganizadorEventos, label: 'Eventos', icon: Calendar, enabled: true, roles: ['PROMOTER', 'PROMOTER_STAFF'] },
  { href: paths.miOrganizadorScanner, label: 'Escanear pase', icon: QrCode, enabled: true, roles: ['PROMOTER', 'PROMOTER_STAFF'] },
  { href: paths.miOrganizadorStaff, label: 'Staff', icon: Users, enabled: true, roles: ['PROMOTER'] },
];

function visibleFor(role: Role, group: NavItem[]): NavItem[] {
  return group.filter((item) => item.roles.includes(role));
}

function NavSection({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-primary/50">
        {title}
      </p>
      {(() => {
        const matchingHrefs = items
          .filter((it) => pathname === it.href || pathname.startsWith(`${it.href}/`))
          .map((it) => it.href);
        const bestMatch = matchingHrefs.sort((a, b) => b.length - a.length)[0];
        return items.map((item) => {
        const Icon = item.icon;
        const active = item.href === bestMatch;
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
            onClick={onNavigate}
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
        });
      })()}
    </div>
  );
}

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Plataforma',
  VENUE_OWNER: 'Dueño de local',
  VENUE_STAFF: 'Staff de local',
  PROMOTER: 'Organizador',
  PROMOTER_STAFF: 'Staff de organizador',
  CUSTOMER: 'Cliente',
};

interface SidebarBodyProps {
  user: User;
  platformItems: NavItem[];
  venueItems: NavItem[];
  promoterItems: NavItem[];
  pathname: string;
  onLogout: () => void;
  isLoggingOut: boolean;
  onNavigate?: () => void;
}

function SidebarBody({
  user,
  platformItems,
  venueItems,
  promoterItems,
  pathname,
  onLogout,
  isLoggingOut,
  onNavigate,
}: SidebarBodyProps) {
  return (
    <div className="flex h-full flex-col px-4 py-6">
      <div className="mb-8 px-2">
        <span className="bg-gradient-to-r from-white to-purple-300 bg-clip-text font-display text-lg font-bold tracking-tight text-transparent">
          {clientEnv.NEXT_PUBLIC_APP_NAME}
        </span>
        <p className="text-xs text-primary/70 mt-0.5">Panel admin</p>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto">
        <NavSection
          title="Plataforma"
          items={platformItems}
          pathname={pathname}
          onNavigate={onNavigate}
        />
        <NavSection
          title="Mi local"
          items={venueItems}
          pathname={pathname}
          onNavigate={onNavigate}
        />
        <NavSection
          title="Mi panel"
          items={promoterItems}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      </nav>
      <div className="border-t border-white/8 pt-4">
        <div className="mb-3 px-2">
          <p className="truncate text-sm font-medium">{user.name ?? user.email}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-primary/80">
            {ROLE_LABEL[user.role]}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          disabled={isLoggingOut}
          onClick={onLogout}
        >
          <LogOut className="size-4" />
          {isLoggingOut ? 'Cerrando...' : 'Cerrar sesion'}
        </Button>
      </div>
    </div>
  );
}

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const { mutate: logout, isPending } = useLogout();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const platformItems = visibleFor(user.role, PLATFORM_NAV);
  const venueItems = visibleFor(user.role, VENUE_NAV);
  const promoterItems = visibleFor(user.role, PROMOTER_NAV);

  return (
    <div className="relative min-h-dvh bg-background">
      {/* Subtle bokeh background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80rem 60rem at 100% 0%, oklch(0.62 0.245 296.5 / 0.07) 0%, transparent 70%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60rem 50rem at 0% 100%, oklch(0.55 0.28 320 / 0.05) 0%, transparent 70%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50rem 40rem at 20% 40%, oklch(0.45 0.2 260 / 0.03) 0%, transparent 70%)' }} />
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[260px] flex-col border-r border-white/8 bg-white/[0.03] backdrop-blur-xl md:flex">
        <SidebarBody
          user={user}
          platformItems={platformItems}
          venueItems={venueItems}
          promoterItems={promoterItems}
          pathname={pathname}
          onLogout={() => logout()}
          isLoggingOut={isPending}
        />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[280px] border-r border-white/8 bg-background p-0 sm:max-w-[280px]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menú</SheetTitle>
          </SheetHeader>
          <SidebarBody
            user={user}
            platformItems={platformItems}
            venueItems={venueItems}
            promoterItems={promoterItems}
            pathname={pathname}
            onLogout={() => logout()}
            isLoggingOut={isPending}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="relative z-10 flex min-h-dvh flex-col md:pl-[260px]">
        {/* Mobile topbar */}
        <header
          className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/8 bg-background/85 px-4 pb-3 backdrop-blur-xl md:hidden"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Abrir menú"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <Link
            href={paths.dashboard}
            className="bg-gradient-to-r from-white to-purple-300 bg-clip-text font-display text-base font-bold tracking-tight text-transparent"
          >
            {clientEnv.NEXT_PUBLIC_APP_NAME}
          </Link>
        </header>

        {user.mustChangePassword ? (
          <div className="flex flex-col items-start gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:text-sm">
            <span>Estás usando una contraseña temporal — cámbiala para mayor seguridad.</span>
            <Link
              href={paths.cambiarPassword}
              className="shrink-0 font-semibold underline hover:no-underline"
            >
              Cambiar ahora
            </Link>
          </div>
        ) : null}

        <main className="flex-1 bg-transparent px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
