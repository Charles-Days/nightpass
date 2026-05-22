import Link from 'next/link';
import { LogIn, ShieldCheck } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { paths } from '@/core/config/paths';
import type { Role } from '@/core/types/api';

interface Props {
  user: { name: string | null; email: string; role: Role } | null;
}

export function TopBar({ user }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/8 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href={paths.home} className="flex items-center gap-2">
          <span className="font-display text-lg font-bold tracking-tight">
            <span className="bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
              NightPass
            </span>
          </span>
        </Link>

        <div className="hidden md:flex md:items-center md:gap-2">
          <Link
            href={paths.home}
            className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-white/[0.05] hover:text-foreground"
          >
            Inicio
          </Link>
          <Link
            href={paths.buscar}
            className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-white/[0.05] hover:text-foreground"
          >
            Buscar
          </Link>
          <Link
            href={paths.pases}
            className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-white/[0.05] hover:text-foreground"
          >
            Mis pases
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {user.role !== 'CUSTOMER' && (
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href={paths.dashboard}>
                    <ShieldCheck className="size-4" />
                    Panel
                  </Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link href={paths.perfil}>
                  <span className="grid size-8 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                    {(user.name?.[0] ?? user.email[0]).toUpperCase()}
                  </span>
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href={paths.iniciarSesion}>
                  <LogIn className="size-4" />
                  Entrar
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] shadow-[0_4px_20px_-4px_rgba(168,85,247,0.55)]"
              >
                <Link href={paths.registro}>Crear cuenta</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
