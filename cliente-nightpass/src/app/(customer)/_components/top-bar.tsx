'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Camera, LogIn, ShieldCheck } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { paths } from '@/core/config/paths';
import type { User } from '@/core/types/api';
import { cn } from '@/core/lib/utils/cn';
import { useSession } from '@/features/auth';

interface Props {
  user: User | null;
}

export function TopBar({ user: initialUser }: Props) {
  // Fuente de verdad reactiva: arranca con el user del server (sin parpadeo) y
  // revalida al montar. Corrige el bug en que tras iniciar sesión seguía
  // mostrando "Crear cuenta" hasta recargar a mano (prop del layout viejo).
  const { data: user } = useSession(initialUser);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 10);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-20 transition-all duration-300 ease-out',
        'pt-[env(safe-area-inset-top)]',
        scrolled
          ? 'border-b border-white/10 bg-background/70 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.6)] backdrop-blur-sm'
          : 'border-b border-transparent bg-background/30',
      )}
      style={scrolled ? { WebkitBackdropFilter: 'blur(8px)' } : undefined}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-5 py-4 sm:gap-4 sm:px-8">
        <Link
          href={paths.appHome}
          className="flex items-center gap-2 transform-gpu transition-transform duration-150 active:scale-95"
        >
          <span className="font-display text-base font-bold tracking-tight sm:text-lg">
            <span className="bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
              NightPass
            </span>
          </span>
        </Link>

        <div className="hidden md:flex md:items-center md:gap-2">
          <Link
            href={paths.appHome}
            className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-white/[0.05] hover:text-foreground active:scale-95"
          >
            Antros
          </Link>
          <Link
            href={paths.eventos}
            className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-white/[0.05] hover:text-foreground active:scale-95"
          >
            Eventos
          </Link>
          <Link
            href={paths.pases}
            className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-white/[0.05] hover:text-foreground active:scale-95"
          >
            Mis pases
          </Link>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {user ? (
            <>
              {(user.role === 'VENUE_OWNER' || user.role === 'VENUE_STAFF') && (
                <Link
                  href={`${paths.miLocalStories}?compose=record&return=app`}
                  aria-label="Subir historia"
                  title="Subir historia"
                  className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/30 bg-gradient-to-tr from-fuchsia-500/15 via-purple-500/15 to-pink-500/15 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-fuchsia-200 transition active:scale-95 hover:from-fuchsia-500/25 hover:via-purple-500/25 hover:to-pink-500/25 sm:px-3"
                >
                  <Camera className="size-3.5" />
                  <span className="hidden sm:inline">Historia</span>
                </Link>
              )}
              {user.role !== 'CUSTOMER' && (
                <Link
                  href={paths.dashboard}
                  aria-label="Ir al panel"
                  title="Panel"
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary transition active:scale-95 hover:bg-primary/15 sm:px-3"
                >
                  <ShieldCheck className="size-3.5" />
                  <span className="hidden sm:inline">Panel</span>
                </Link>
              )}
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="transform-gpu transition-transform duration-150 active:scale-95"
              >
                <Link href={paths.perfil}>
                  <span className="grid size-8 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary ring-1 ring-primary/30">
                    {(user.name?.[0] ?? user.email[0]).toUpperCase()}
                  </span>
                </Link>
              </Button>
            </>
          ) : (
            <Suspense
              fallback={
                <AuthButtonsView loginHref={paths.iniciarSesion} registroHref={paths.registro} />
              }
            >
              <GuestAuthButtons />
            </Suspense>
          )}
        </div>
      </div>
    </header>
  );
}

// Botones de invitado: cuelgan el `from` = ruta actual (con su query, incluido
// el ?ref= del RP). Así, si el usuario abre un link RP y entra/crea cuenta desde
// el nav (sin pasar por Comprar), tras login vuelve a la misma página con el ref
// intacto en vez de caer en home.
function GuestAuthButtons() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const AUTH_PATHS = [
    paths.iniciarSesion,
    paths.registro,
    paths.recuperarPassword,
    paths.restablecerPassword,
  ];
  const onAuthPage = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const qs = searchParams.toString();
  const current = `${pathname}${qs ? `?${qs}` : ''}`;
  const fromQuery = onAuthPage ? '' : `?from=${encodeURIComponent(current)}`;

  return (
    <AuthButtonsView
      loginHref={`${paths.iniciarSesion}${fromQuery}`}
      registroHref={`${paths.registro}${fromQuery}`}
    />
  );
}

function AuthButtonsView({
  loginHref,
  registroHref,
}: {
  loginHref: string;
  registroHref: string;
}) {
  return (
    <>
      <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
        <Link href={loginHref as never}>
          <LogIn className="size-4" />
          Entrar
        </Link>
      </Button>
      <Button
        asChild
        size="sm"
        className="rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] shadow-[0_4px_20px_-4px_rgba(168,85,247,0.55)] transform-gpu transition-transform duration-150 active:scale-95"
      >
        <Link href={registroHref as never}>Crear cuenta</Link>
      </Button>
    </>
  );
}
