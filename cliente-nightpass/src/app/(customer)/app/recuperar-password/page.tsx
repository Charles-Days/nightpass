import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { paths } from '@/core/config/paths';
import { ForgotPasswordForm } from '@/features/auth';

export const metadata = { title: 'Recuperar contraseña — NightPass' };

export default function CustomerForgotPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-md px-5 py-12 sm:px-8">
      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
        Recuperar acceso
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight">
        ¿Olvidaste tu contraseña?
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ingresa tu email y te enviamos un link para crear una nueva. El link expira en 60 minutos.
      </p>

      <div className="mt-8 rounded-[22px] border border-white/10 bg-white/[0.025] p-6">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-md bg-white/[0.04]" />}>
          <ForgotPasswordForm />
        </Suspense>
      </div>

      <p className="mt-6 text-center text-sm">
        <Link
          href={paths.iniciarSesion}
          className="inline-flex items-center gap-1.5 text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
