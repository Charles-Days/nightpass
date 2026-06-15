import { notFound } from 'next/navigation';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import type { PromoterMe } from '@/core/types/api';
import { RewardsManager } from '@/features/rewards-admin';

export const metadata = { title: 'Recompensas · NightPass Admin' };

export default async function MiOrganizadorRecompensasPage() {
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
        <h1 className="font-display text-3xl font-bold tracking-tight">Recompensas</h1>
        <p className="text-sm text-muted-foreground">
          Define qué pueden canjear tus clientes con sus NPP y valida sus cupones.
        </p>
      </header>

      <div className="rounded-[22px] border border-white/14 bg-white/[0.05] p-6">
        <RewardsManager promoterId={me.promoter.id} />
      </div>
    </div>
  );
}
