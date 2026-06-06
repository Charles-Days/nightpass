import { redirect } from 'next/navigation';
import { serverFetch } from '@/core/lib/api/server-client';
import { VisitorsCard, FunnelCard, InsightsCard } from '@/features/metrics';
import type { FunnelStats, InsightsStats, User, VisitorStats } from '@/core/types/api';

export const metadata = { title: 'Métricas' };

export default async function MetricasPage() {
  const user = await serverFetch<User>('/auth/me', { revalidate: 60 });
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const [visitors, funnel, insights] = await Promise.all([
    serverFetch<VisitorStats>('/metrics/visitors', { revalidate: 120 }).catch(() => null),
    serverFetch<FunnelStats>('/metrics/funnel', { revalidate: 120 }).catch(() => null),
    serverFetch<InsightsStats>('/metrics/insights', { revalidate: 120 }).catch(() => null),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-1.5 border-b border-white/10 pb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary sm:text-[11px]">
          Panel de gestión
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Métricas <span className="text-muted-foreground">·</span> NightPass
        </h1>
        <p className="text-sm text-muted-foreground">
          Comportamiento de los usuarios: visitas, embudo de conversión, canje de
          pases e insights para decidir qué mejorar.
        </p>
      </header>

      {visitors && <VisitorsCard visitors={visitors} />}
      {funnel && <FunnelCard funnel={funnel} />}
      {insights && <InsightsCard insights={insights} />}

      {!visitors && !funnel && !insights && (
        <p className="text-sm text-muted-foreground">
          Aún no hay datos de métricas. Se empiezan a poblar con el tráfico a
          partir de este deploy.
        </p>
      )}
    </div>
  );
}
