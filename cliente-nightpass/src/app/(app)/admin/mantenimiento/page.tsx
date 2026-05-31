import { serverFetch } from '@/core/lib/api/server-client';
import { MaintenanceToggle } from './_components/maintenance-toggle';

export const metadata = { title: 'Mantenimiento' };

interface Status {
  maintenance: boolean;
  message: string | null;
}

export default async function MaintenancePage() {
  let status: Status = { maintenance: false, message: null };
  try {
    status = await serverFetch<Status>('/maintenance');
  } catch {
    // Backend caído — el toggle no podrá guardar, pero mostramos la página.
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
        Plataforma
      </p>
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Modo mantenimiento
      </h1>
      <p className="text-sm text-muted-foreground">
        Bloquea la app con una pantalla de &ldquo;Estamos actualizando&rdquo;.
        Úsalo antes de un deploy o una migración. Se aplica al instante, sin
        redeploy.
      </p>

      <MaintenanceToggle initial={status} />
    </div>
  );
}
