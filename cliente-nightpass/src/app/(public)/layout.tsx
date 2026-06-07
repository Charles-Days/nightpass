import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowLeft, LogIn } from 'lucide-react';
import { clientEnv } from '@/core/config/env';
import { paths } from '@/core/config/paths';
import { ACCESS_COOKIE } from '@/core/config/cookies';
import { Button } from '@/core/components/ui/button';
import { VisitTracker } from '@/core/components/visit-tracker';
import { serverFetch } from '@/core/lib/api/server-client';
import type { User } from '@/core/types/api';

// Páginas públicas (landing, privacidad…) se ven con o sin sesión. Si el visitante
// YA tiene sesión, ofrecerle "Iniciar sesión" no tiene sentido (y para un CUSTOMER
// /login lo rechaza). En ese caso lo mandamos de vuelta a su área de la app.
async function getSessionUser(): Promise<User | null> {
  // Sin cookie de acceso = invitado. Evita un round-trip a /auth/me en el caso
  // más común del landing (visitante anónimo).
  const hasAccess = (await cookies()).has(ACCESS_COOKIE);
  if (!hasAccess) return null;
  try {
    return await serverFetch<User>('/auth/me');
  } catch {
    return null;
  }
}

function appDestFor(user: User): string {
  return user.role === 'CUSTOMER' ? paths.perfil : paths.dashboard;
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const backHref = user ? appDestFor(user) : null;

  return (
    <div className="relative flex min-h-screen flex-col">
        <VisitTracker />
        <header className="sticky top-0 z-20 border-b border-white/5 bg-background/40 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href={paths.home} className="font-display text-lg font-bold tracking-tight">
              {clientEnv.NEXT_PUBLIC_APP_NAME.replace(' Admin', '')}
            </Link>
            {backHref ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={backHref as never}>
                  <ArrowLeft className="size-4" />
                  Volver
                </Link>
              </Button>
            ) : (
              <Button asChild variant="ghost" size="sm">
                <Link href={paths.login}>
                  <LogIn className="size-4" />
                  Iniciar sesión
                </Link>
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-white/5 bg-background/30 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 py-6 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
            <p>© {new Date().getFullYear()} NightPass · Todos los derechos reservados.</p>
            <div className="flex gap-4">
              <Link href={paths.solicitarLocal} className="hover:text-foreground">
                Soy un local
              </Link>
              {backHref ? (
                <Link href={backHref as never} className="hover:text-foreground">
                  Volver a la app
                </Link>
              ) : (
                <Link href={paths.login} className="hover:text-foreground">
                  Iniciar sesión
                </Link>
              )}
            </div>
          </div>
        </footer>
    </div>
  );
}
