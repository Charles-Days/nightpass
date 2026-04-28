import { Suspense } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { paths } from '@/core/config/paths';
import { LoginForm } from '@/features/auth';

export const metadata = { title: 'Iniciar sesión' };

interface LoginPageProps {
  searchParams: Promise<{ reason?: string }>;
}

const REASON_MESSAGES: Record<string, string> = {
  'customer-blocked': 'Esta cuenta es solo para la app móvil de NightPass.',
  'session-expired': 'Tu sesión expiró. Vuelve a iniciar sesión.',
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { reason } = await searchParams;
  const banner = reason ? REASON_MESSAGES[reason] : undefined;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="np-rise text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Panel admin
        </p>
        <h1
          className="np-rise font-display text-3xl font-bold leading-tight tracking-[-0.02em] sm:text-4xl"
          style={{ animationDelay: '100ms' }}
        >
          Bienvenido de vuelta
        </h1>
        <p
          className="np-rise text-sm text-muted-foreground"
          style={{ animationDelay: '220ms' }}
        >
          Ingresa con la cuenta que te dimos para gestionar tu local.
        </p>
      </div>

      {banner ? (
        <div
          role="alert"
          className="np-rise flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
          style={{ animationDelay: '320ms' }}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>{banner}</p>
        </div>
      ) : null}

      <div className="np-rise" style={{ animationDelay: '380ms' }}>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-muted" />}>
          <LoginForm />
        </Suspense>
      </div>

      <div
        className="np-rise space-y-3 border-t border-white/5 pt-6 text-center"
        style={{ animationDelay: '540ms' }}
      >
        <p className="text-sm text-muted-foreground">
          ¿Aún no tienes panel?{' '}
          <Link
            href={paths.solicitarLocal}
            className="font-medium text-primary hover:underline"
          >
            Solicita tu registro
          </Link>
        </p>
        <p className="text-xs text-muted-foreground">
          Si eres cliente final, busca <span className="text-foreground/70">NightPass</span>{' '}
          en App Store o Play Store.
        </p>
      </div>
    </div>
  );
}
