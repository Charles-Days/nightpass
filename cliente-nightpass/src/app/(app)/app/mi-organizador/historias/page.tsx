import { notFound } from 'next/navigation';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import type { PromoterMe } from '@/core/types/api';
import { PromoterStoriesManager } from '@/features/stories-admin';

export const metadata = { title: 'Historias · NightPass Admin' };

export default async function MiOrganizadorHistoriasPage() {
  let me: PromoterMe;
  try {
    me = await serverFetch<PromoterMe>('/promoters/me', { revalidate: 300 });
  } catch (err) {
    if (err instanceof ServerApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          {me.promoter.name}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Historias</h1>
        <p className="text-sm text-muted-foreground">
          Sube fotos o videos cortos por evento. Caducan a las 24h.
        </p>
      </header>

      <PromoterStoriesManager />
    </div>
  );
}
