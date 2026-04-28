import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { clientEnv } from '@/core/config/env';
import { paths } from '@/core/config/paths';
import { Button } from '@/core/components/ui/button';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-white/5 bg-background/40 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href={paths.home} className="font-display text-lg font-bold tracking-tight">
              {clientEnv.NEXT_PUBLIC_APP_NAME.replace(' Admin', '')}
            </Link>
            <Button asChild variant="ghost" size="sm">
              <Link href={paths.login}>
                <LogIn className="size-4" />
                Iniciar sesión
              </Link>
            </Button>
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
              <Link href={paths.login} className="hover:text-foreground">
                Iniciar sesión
              </Link>
            </div>
          </div>
        </footer>
    </div>
  );
}
