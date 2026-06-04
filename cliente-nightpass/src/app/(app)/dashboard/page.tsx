import { AlertTriangle, Users } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/components/ui/card';
import { serverFetch } from '@/core/lib/api/server-client';
import type { AdminFinanceStats, User, VisitorStats } from '@/core/types/api';
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

  let visitors: VisitorStats | null = null;
  try {
    visitors = await serverFetch<VisitorStats>('/metrics/visitors', { revalidate: 120 });
  } catch {
    visitors = null;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-white/5 pb-6 sm:flex-row sm:items-end sm:justify-between">
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

      {visitors && <VisitorsCard visitors={visitors} />}

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

function VisitorsCard({ visitors }: { visitors: VisitorStats }) {
  const max = Math.max(1, ...visitors.last7.map((d) => d.count));
  const fmt = new Intl.NumberFormat('es-MX');

  // Cuentas atribuibles a visitantes. El tracking de conversión (cookie np_vid)
  // solo empezó a contar hace poco, así que `conversions.allTime` (p.ej. 4) NO
  // refleja las cuentas que ya existían antes — la BD tiene `totalAccounts`
  // (p.ej. 74). Tomamos el mayor de ambos y lo capamos al total de visitantes
  // (no puede haber más titulares de cuenta que visitantes únicos). Así
  // "con cuenta" + "sin cuenta" = total histórico y cuadra con la BD.
  const accountsHeld = Math.min(
    visitors.allTime,
    Math.max(visitors.conversions?.allTime ?? 0, visitors.totalAccounts ?? 0),
  );
  const dayLabel = (iso: string) =>
    new Intl.DateTimeFormat('es-MX', { weekday: 'short', timeZone: 'America/Mexico_City' }).format(
      new Date(`${iso}T12:00:00Z`),
    );

  return (
    <Card className="rounded-[22px] border border-white/10 bg-white/[0.025]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-primary" />
          Visitantes y conversión
        </CardTitle>
        <CardDescription>
          Visitantes únicos del sitio y cuántos crearon cuenta. Dedup por
          visitante (cookie / IP), aproximado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Hoy
            </p>
            <p className="font-display text-3xl font-bold tabular-nums text-white">
              {fmt.format(visitors.today)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Total histórico
            </p>
            <p className="font-display text-3xl font-bold tabular-nums text-primary">
              {fmt.format(visitors.allTime)}
            </p>
          </div>
          {typeof visitors.totalAccounts === 'number' && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Cuentas totales
              </p>
              <p className="font-display text-3xl font-bold tabular-nums text-emerald-400">
                {fmt.format(visitors.totalAccounts)}
              </p>
              <p className="text-[10px] text-muted-foreground">clientes en la BD</p>
            </div>
          )}

          <div className="ml-auto flex items-end gap-2">
            {visitors.last7.map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] tabular-nums text-white/60">{d.count}</span>
                <div className="flex h-16 w-5 items-end rounded-md bg-white/[0.04]">
                  <div
                    className="w-full rounded-md bg-gradient-to-t from-[#9333ea] to-[#a855f7]"
                    style={{ height: `${Math.round((d.count / max) * 100)}%` }}
                  />
                </div>
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  {dayLabel(d.date)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {visitors.conversions && (
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/8 pt-4 sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Con cuenta
              </p>
              <p className="font-display text-2xl font-bold tabular-nums text-emerald-400">
                {fmt.format(accountsHeld)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {fmt.format(visitors.conversions.today)} hoy
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Sin cuenta
              </p>
              <p className="font-display text-2xl font-bold tabular-nums text-white/70">
                {fmt.format(Math.max(0, visitors.allTime - accountsHeld))}
              </p>
              <p className="text-[10px] text-muted-foreground">visitaron, no se registraron</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Tasa de conversión
              </p>
              <p className="font-display text-2xl font-bold tabular-nums text-primary">
                {visitors.allTime > 0
                  ? `${Math.min(100, (accountsHeld / visitors.allTime) * 100).toFixed(1)}%`
                  : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground">cuentas / visitantes</p>
            </div>
            <div className="ml-auto flex items-end gap-2">
              {visitors.conversions.last7.map((d) => {
                const cmax = Math.max(1, ...visitors.conversions!.last7.map((x) => x.count));
                return (
                  <div key={d.date} className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] tabular-nums text-white/60">{d.count}</span>
                    <div className="flex h-10 w-4 items-end rounded-md bg-white/[0.04]">
                      <div
                        className="w-full rounded-md bg-gradient-to-t from-emerald-600 to-emerald-400"
                        style={{ height: `${Math.round((d.count / cmax) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                      {dayLabel(d.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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

      <Card className="rounded-[22px] border border-white/10 bg-white/[0.025]">
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
