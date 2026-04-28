import Link from 'next/link';
import { LavaBackground } from './_components/lava-background';
import { AuthAside } from './_components/auth-aside';
import { clientEnv } from '@/core/config/env';
import { paths } from '@/core/config/paths';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <AuthAside />
      <main className="relative flex min-h-screen items-center justify-center px-6 py-10 sm:px-10">
        <div className="lg:hidden">
          <LavaBackground />
        </div>
        <div className="relative w-full max-w-sm">
          <Link
            href={paths.home}
            className="mb-10 inline-flex items-center gap-2 font-display text-lg font-bold tracking-tight lg:hidden"
          >
            {clientEnv.NEXT_PUBLIC_APP_NAME.replace(' Admin', '')}
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
