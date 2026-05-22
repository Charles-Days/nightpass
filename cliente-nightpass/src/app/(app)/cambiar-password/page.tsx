import { ChangePasswordForm } from '@/features/auth';

export const metadata = { title: 'Cambiar contraseña' };

export default function CambiarPasswordPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <div className="mb-8 space-y-2">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Seguridad
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Cambia tu contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Estás usando una contraseña temporal. Cámbiala para mayor seguridad.
        </p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
