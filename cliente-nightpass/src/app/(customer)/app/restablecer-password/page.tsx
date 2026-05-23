import { Suspense } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { paths } from '@/core/config/paths';
import { ResetPasswordForm } from '@/features/auth';

export const metadata = { title: 'Nueva contraseña — NightPass' };

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function CustomerResetPasswordPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token || token.length < 32) {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-12 sm:px-8">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Link inválido
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight">
          Este link no es válido
        </h1>

        <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            El link que abriste no incluye un token válido. Solicita uno nuevo desde
            "¿Olvidaste tu contraseña?".
          </p>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link
            href={paths.recuperarPassword}
            className="font-medium text-primary hover:underline"
          >
            Solicitar nuevo link
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          <Link href={paths.iniciarSesion} className="hover:text-foreground">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 py-12 sm:px-8">
      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
        Nueva contraseña
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight">
        Crea una nueva contraseña
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Elige una contraseña segura que no hayas usado antes. Después podrás iniciar sesión normalmente.
      </p>

      <div className="mt-8 rounded-[22px] border border-white/10 bg-white/[0.025] p-6">
        <Suspense fallback={<div className="h-48 animate-pulse rounded-md bg-white/[0.04]" />}>
          <ResetPasswordForm token={token} variant="customer" />
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
