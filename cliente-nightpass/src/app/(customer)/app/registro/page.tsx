import { Suspense } from 'react';
import Link from 'next/link';
import { paths } from '@/core/config/paths';
import { CustomerSignupForm } from '@/features/auth';

export const metadata = { title: 'Crear cuenta — NightPass' };

export default function CustomerSignupPage() {
  return (
    <div className="mx-auto w-full max-w-md px-5 py-12 sm:px-8">
      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
        Únete en segundos
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight">
        Crear tu cuenta NightPass
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sin filas, sin efectivo. Empieza a entrar con un QR.
      </p>

      <div className="mt-8 rounded-[22px] border border-white/10 bg-white/[0.025] p-6">
        <Suspense fallback={<div className="h-72 animate-pulse rounded-md bg-white/[0.04]" />}>
          <CustomerSignupForm />
        </Suspense>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{' '}
        <Link href={paths.iniciarSesion} className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
