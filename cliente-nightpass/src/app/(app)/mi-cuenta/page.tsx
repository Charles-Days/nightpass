import { redirect } from 'next/navigation';
import { KeyRound, Mail, UserCircle2 } from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { User } from '@/core/types/api';
import {
  ProfileNameForm,
  EmailChangeForm,
  ChangePasswordForm,
} from '@/features/auth';

export const metadata = { title: 'Mi cuenta', robots: { index: false, follow: false } };

const CARD =
  'rounded-[22px] border border-white/10 bg-white/[0.025] p-6 sm:p-7';

export default async function MiCuentaPage() {
  let user: User;
  try {
    user = await serverFetch<User>('/auth/me');
  } catch (error) {
    if (error instanceof ServerApiError && (error.status === 401 || error.status === 403)) {
      redirect(paths.login);
    }
    throw error;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Tu cuenta
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Mi cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona tu nombre, tu correo de acceso y tu contraseña.
        </p>
      </header>

      <section className={CARD}>
        <div className="mb-5 flex items-center gap-2.5">
          <UserCircle2 className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Perfil</h2>
        </div>
        <ProfileNameForm initialName={user.name ?? ''} />
      </section>

      <section className={CARD}>
        <div className="mb-5 flex items-center gap-2.5">
          <Mail className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Correo electrónico</h2>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          Al cambiar tu correo te enviaremos un link de confirmación al nuevo correo.
          El cambio no se aplica hasta que lo confirmes.
        </p>
        <EmailChangeForm currentEmail={user.email} />
      </section>

      <section className={CARD}>
        <div className="mb-5 flex items-center gap-2.5">
          <KeyRound className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Contraseña</h2>
        </div>
        <ChangePasswordForm redirectTo={paths.miCuenta} />
      </section>
    </div>
  );
}
