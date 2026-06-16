'use client';

import { memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Flame, GlassWater, Ticket, User } from 'lucide-react';
import { paths } from '@/core/config/paths';
import { cn } from '@/core/lib/utils/cn';
import { useSession } from '@/features/auth';
import { useRewardsBadge } from '@/features/rewards';

const items = [
  { href: paths.appHome, label: 'Antros', icon: GlassWater, exact: true },
  { href: paths.eventos, label: 'Eventos', icon: CalendarDays },
  { href: paths.pases, label: 'Pases', icon: Ticket },
  { href: paths.recompensas, label: 'Recompensas', icon: Flame },
  // `aliases`: subpáginas que cuelgan del Perfil (ej. Ajustes) pero viven en otra
  // ruta. Mantienen "Perfil" marcado en la nav mientras navegas dentro de su área.
  { href: paths.perfil, label: 'Perfil', icon: User, aliases: [paths.ajustes] },
];

function isActive(
  pathname: string,
  item: { href: string; exact?: boolean; aliases?: string[] },
) {
  const all = [item.href, ...(item.aliases ?? [])];
  return all.some((p) =>
    item.exact ? pathname === p : pathname === p || pathname.startsWith(`${p}/`),
  );
}

function BottomNavImpl() {
  const pathname = usePathname();
  const activeIndex = items.findIndex((item) => isActive(pathname, item));
  const { data: user } = useSession();
  const showRewardsDot = useRewardsBadge(!!user);

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(env(safe-area-inset-bottom),12px)] md:hidden">
      <ul className="np-nav-in pointer-events-auto relative mx-auto grid h-16 max-w-md grid-cols-5 rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-[#1c1728] to-[#0d0b13] ring-1 ring-inset ring-white/[0.06] shadow-[0_16px_50px_-12px_rgba(0,0,0,0.9),0_0_36px_-14px_rgba(168,85,247,0.55)]">
        {/* Sliding active pill */}
        <li
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-1/2 z-0 h-12 w-[18%] -translate-y-1/2 rounded-2xl bg-gradient-to-b from-[#a855f7]/30 to-[#7c3aed]/10 ring-1 ring-primary/30 shadow-[0_0_24px_-4px_rgba(168,85,247,0.65)] transform-gpu transition-all duration-300 ease-out',
            activeIndex < 0 && 'opacity-0',
          )}
          style={{
            left: `calc(${activeIndex >= 0 ? activeIndex : 0} * 20% + 1%)`,
            willChange: 'transform, left',
          }}
        />

        {items.map((item) => {
          const { href, label, icon: Icon } = item;
          const active = isActive(pathname, item);
          const showDot = href === paths.recompensas && showRewardsDot;
          return (
            <li key={href} className="relative z-10 min-w-0">
              <Link
                href={href}
                className={cn(
                  'flex h-16 min-h-[44px] flex-col items-center justify-center gap-1 px-1 text-[11px] transition-colors duration-200 active:scale-95',
                  active
                    ? 'font-semibold text-primary'
                    : 'font-medium text-white/70 hover:text-white/90',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span className="relative">
                  <Icon
                    className={cn(
                      'size-5 shrink-0 transform-gpu transition-transform duration-200',
                      active && 'scale-110 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]',
                    )}
                    strokeWidth={active ? 2.4 : 1.8}
                  />
                  {showDot ? (
                    <span
                      aria-label="Tienes algo por canjear"
                      className="absolute -right-1 -top-0.5 size-2.5 rounded-full bg-fuchsia-400 ring-2 ring-[#0d0b13] shadow-[0_0_8px_rgba(232,121,249,0.8)]"
                    />
                  ) : null}
                </span>
                <span className="w-full truncate text-center leading-none tracking-tight">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export const BottomNav = memo(BottomNavImpl);
