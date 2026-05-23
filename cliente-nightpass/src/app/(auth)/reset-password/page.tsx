import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { paths } from '@/core/config/paths';
import { ResetPasswordForm } from '@/features/auth';

export const metadata = { title: 'Nueva contraseña' };

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  if (!token || token.length < 32) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <p className="np-rise text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Link inválido
          </p>
          <h1
            className="np-rise font-display text-3xl font-bold leading-tight tracking-[-0.02em] sm:text-4xl"
            style={{ animationDelay: '100ms' }}
          >
            Este link no es válido
          </h1>
        </div>

        <div
          className="np-rise flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
          style={{ animationDelay: '320ms' }}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            El link que abriste no incluye un token válido. Solicita uno nuevo desde "¿Olvidaste tu contraseña?".
          </p>
        </div>

        <div
          className="np-rise space-y-3 border-t border-white/5 pt-6 text-center"
          style={{ animationDelay: '540ms' }}
        >
          <Link
            href={paths.forgotPassword}
            className="text-sm font-medium text-primary hover:underline"
          >
            Solicitar nuevo link
          </Link>
          <p className="text-xs text-muted-foreground">
            <Link href={paths.login} className="hover:text-foreground">
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="np-rise text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Nueva contraseña
        </p>
        <h1
          className="np-rise font-display text-3xl font-bold leading-tight tracking-[-0.02em] sm:text-4xl"
          style={{ animationDelay: '100ms' }}
        >
          Crea una nueva contraseña
        </h1>
        <p
          className="np-rise text-sm text-muted-foreground"
          style={{ animationDelay: '220ms' }}
        >
          Elige una contraseña segura que no hayas usado antes. Después podrás iniciar sesión normalmente.
        </p>
      </div>

      <div className="np-rise" style={{ animationDelay: '380ms' }}>
        <ResetPasswordForm token={token} />
      </div>

      <div
        className="np-rise border-t border-white/5 pt-6 text-center"
        style={{ animationDelay: '540ms' }}
      >
        <Link
          href={paths.login}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
}
