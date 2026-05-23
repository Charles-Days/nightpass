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

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 px-2 py-3 text-[10px] font-medium transition',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
