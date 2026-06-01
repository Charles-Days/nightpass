import { redirect } from 'next/navigation';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { PromoterMe } from '@/core/types/api';
import { PromoterEventsList } from '@/features/promoters';

export const metadata = { title: 'Mis eventos' };

export default async function MiPromotoraEventosPage() {
  let me: PromoterMe;
  try {
    me = await serverFetch<PromoterMe>('/promoters/me', { revalidate: 300 });
  } catch (err) {
    if (err instanceof ServerApiError && err.status === 404) redirect(paths.miOrganizador);
    throw err;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          {me.promoter.name}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Mis eventos
        </h1>
        <p className="text-sm text-muted-foreground">
          Crea y gestiona los eventos que organizas.
        </p>
      </header>

      <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-6">
        <PromoterEventsList />
      </div>
    </div>
  );
}
