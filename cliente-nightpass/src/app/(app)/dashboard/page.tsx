import { AlertTriangle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/components/ui/card';
import { serverFetch } from '@/core/lib/api/server-client';
import { PushTestCard } from '@/features/push';
import type { AdminFinanceStats, User } from '@/core/types/api';
import {
  KpiCards,
  MoneyBreakdown,
  DailyChart,
  EventsTable,
  TopLists,
  StripeHealthCard,
  RangePicker,
} from '@/features/admin-finance';

export const metadata = { title: 'Dashboard' };

/** Rango por defecto: últimos 30 días (terminando hoy). */
function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default async function DashboardPage(props: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await serverFetch<User>('/auth/me', { revalidate: 60 });

  if (user.role !== 'ADMIN') {
    return <WelcomeCard user={user} />;
  }

  const sp = await props.searchParams;
  const fallback = defaultRange();
  const from = sp.from ?? fallback.from;
  const to = sp.to ?? fallback.to;

  const query = new URLSearchParams({ from, to }).toString();

  let stats: AdminFinanceStats | null = null;
  try {
    stats = await serverFetch<AdminFinanceStats>(`/admin/finance/stats?${query}`, {
      revalidate: 120,
    });
  } catch {
    stats = null;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary sm:text-[11px]">
            Panel de gestión
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Finanzas <span className="text-muted-foreground">·</span> NightPass
          </h1>
          <p className="text-sm text-muted-foreground">
            Vista global de dinero, ventas y salud de cobros de toda la plataforma.
          </p>
        </div>
        <RangePicker from={from} to={to} />
      </header>

      <PushTestCard />

      {stats === null ? (
        <Card className="rounded-[22px] border border-amber-500/20 bg-amber-500/[0.04]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-300">
              <AlertTriangle className="size-5" />
              No se pudieron cargar las finanzas
            </CardTitle>
            <CardDescription>
              El módulo de finanzas del backend no respondió. Intenta recargar en unos
              minutos o revisa el estado del servidor.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <KpiCards totals={stats.totals} />

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <MoneyBreakdown totals={stats.totals} />
            <DailyChart series={stats.dailySeries} />
          </section>

          <EventsTable rows={stats.byEvent} />

          <TopLists
            topVenues={stats.topVenues}
            topPromoters={stats.topPromoters}
            topRps={stats.topRps}
          />

          <StripeHealthCard
            health={stats.stripeHealth}
            refundedCount={stats.totals.refundedCount}
            refundedAmountCents={stats.totals.refundedAmountCents}
            failedCount={stats.totals.failedCount}
          />

          <p className="text-[11px] text-muted-foreground">
            Fee Stripe estimado con {(stats.feeAssumptions.stripePct * 100).toFixed(2)}% +{' '}
            {`$${(stats.feeAssumptions.stripeFixedCents / 100).toFixed(2)}`} por transacción.
            Comisión NightPass por defecto: {(stats.feeAssumptions.platformFeePctDefault * 100).toFixed(1)}%.
          </p>
        </>
      )}
    </div>
  );
}

function WelcomeCard({ user }: { user: User }) {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary sm:text-[11px]">
          Panel de gestión
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Bienvenido, {user.name ?? user.email}
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestiona tus eventos y tu local desde el menú lateral.
        </p>
      </header>

      <Card className="rounded-[22px] border border-white/14 bg-white/[0.05]">
        <CardHeader>
          <CardTitle>Tu cuenta</CardTitle>
          <CardDescription>Sesión activa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Email:</span> {user.email}
          </p>
          <p>
            <span className="text-muted-foreground">Rol:</span>{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{user.role}</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
