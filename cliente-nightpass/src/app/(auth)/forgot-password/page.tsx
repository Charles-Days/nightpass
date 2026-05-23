import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { paths } from '@/core/config/paths';
import { ForgotPasswordForm } from '@/features/auth';

export const metadata = { title: 'Recuperar contraseña' };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="np-rise text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Recuperar acceso
        </p>
        <h1
          className="np-rise font-display text-3xl font-bold leading-tight tracking-[-0.02em] sm:text-4xl"
          style={{ animationDelay: '100ms' }}
        >
          ¿Olvidaste tu contraseña?
        </h1>
        <p
          className="np-rise text-sm text-muted-foreground"
          style={{ animationDelay: '220ms' }}
        >
          Ingresa tu email y te enviamos un link para crear una nueva. El link expira en 60 minutos.
        </p>
      </div>

      <div className="np-rise" style={{ animationDelay: '380ms' }}>
        <ForgotPasswordForm />
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
