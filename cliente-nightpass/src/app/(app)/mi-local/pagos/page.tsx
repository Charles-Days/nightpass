import { redirect } from 'next/navigation';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { User, Venue } from '@/core/types/api';
import { StripeConnectCard } from '@/features/stripe';

export const metadata = { title: 'Pagos · Mi local' };

export default async function PagosPage() {
  let user: User;
  try {
    user = await serverFetch<User>('/auth/me', { revalidate: 60 });
  } catch (err) {
    if (err instanceof ServerApiError && (err.status === 401 || err.status === 403)) {
      redirect(paths.login);
    }
    throw err;
  }

  if (user.role !== 'VENUE_OWNER' && user.role !== 'ADMIN') {
    redirect(paths.dashboard);
  }

  // Solo id/nombre para las tarjetas; StripeConnectCard fetchea su estado en cliente.
  const venues = await serverFetch<Venue[]>('/venues/my', { revalidate: 300 });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Mi local
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          Pagos · Stripe Connect
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Conecta tu cuenta de Stripe para empezar a recibir pagos de los pases.
          NightPass cobra una comisión de la plataforma sobre cada venta.
        </p>
      </header>

      {venues.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay locales asociados a tu cuenta.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {venues.map((v) => (
            <StripeConnectCard key={v.id} venueId={v.id} venueName={v.name} />
          ))}
        </div>
      )}
    </div>
  );
}
