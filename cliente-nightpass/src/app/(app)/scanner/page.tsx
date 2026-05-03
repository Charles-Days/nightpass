import { redirect } from 'next/navigation';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { User } from '@/core/types/api';
import { QrScanner } from '@/features/scanner';

export default async function ScannerPage() {
  let user: User;
  try {
    user = await serverFetch<User>('/auth/me');
  } catch (err) {
    if (err instanceof ServerApiError && (err.status === 401 || err.status === 403)) {
      redirect(paths.login);
    }
    throw err;
  }

  const allowed = ['ADMIN', 'VENUE_OWNER', 'VENUE_STAFF'];
  if (!allowed.includes(user.role)) {
    redirect(paths.dashboard);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Puerta
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          Escanear pase
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Apunta la cámara al QR del pase del cliente. La validación es
          inmediata.
        </p>
      </div>

      <QrScanner />
    </div>
  );
}
