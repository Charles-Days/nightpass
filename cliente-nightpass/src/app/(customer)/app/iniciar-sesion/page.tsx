import { Suspense } from 'react';
import Link from 'next/link';
import { paths } from '@/core/config/paths';
import { CustomerLoginForm } from '@/features/auth';

export const metadata = { title: 'Entrar — NightPass' };

export default function CustomerLoginPage() {
  return (
    <div className="mx-auto w-full max-w-md px-5 py-12 sm:px-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
        Tu noche, tu pase
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight">
        Entra a NightPass
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Compra tu cover y guarda tus pases en un solo lugar.
      </p>

      <div className="mt-8 rounded-[22px] border border-white/10 bg-white/[0.025] p-6">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-white/[0.04]" />}>
          <CustomerLoginForm />
        </Suspense>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{' '}
        <Link href={paths.registro} className="font-medium text-primary hover:underline">
          Crear una
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        ¿Eres dueño de un local?{' '}
        <Link href={paths.login} className="hover:text-foreground">
          Entrar al panel
        </Link>
      </p>
    </div>
  );
}
