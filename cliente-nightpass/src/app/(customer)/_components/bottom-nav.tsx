'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Home, Search, Ticket, User } from 'lucide-react';
import { paths } from '@/core/config/paths';
import { cn } from '@/core/lib/utils/cn';

const items = [
  { href: paths.appHome, label: 'Inicio', icon: Home, exact: true },
  { href: paths.buscar, label: 'Buscar', icon: Search },
  { href: paths.pases, label: 'Pases', icon: Ticket },
  { href: paths.recompensas, label: 'Recompensas', icon: Flame },
  { href: paths.perfil, label: 'Perfil', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const activeIndex = items.findIndex(({ href, exact }) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`),
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      style={{ WebkitBackdropFilter: 'blur(12px)' }}
    >
      <ul className="relative mx-auto grid h-16 max-w-md grid-cols-5">
        {/* Sliding active pill */}
        <li
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-1/2 z-0 h-12 w-[18%] -translate-y-1/2 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.025] ring-1 ring-white/10 transform-gpu transition-all duration-300 ease-out',
            activeIndex < 0 && 'opacity-0',
          )}
          style={{
            left: `calc(${activeIndex >= 0 ? activeIndex : 0} * 20% + 1%)`,
            willChange: 'transform, left',
          }}
        />

        {items.map(({ href, label, icon: Icon, exact }, i) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="relative z-10">
              <Link
                href={href}
                className={cn(
                  'flex h-16 min-h-[44px] flex-col items-center justify-center gap-1 px-2 text-[10px] font-medium transition-colors duration-200 active:scale-95',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon
                  className={cn(
                    'size-5 transform-gpu transition-transform duration-200',
                    active && 'scale-110',
                  )}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span className="leading-none">{label}</span>
                {i < 0 && null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
