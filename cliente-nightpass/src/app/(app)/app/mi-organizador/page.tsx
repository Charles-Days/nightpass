import Link from 'next/link';
import {
  Calendar,
  MapPin,
  CheckCircle2,
  PauseCircle,
  Plus,
  Pencil,
  Ticket,
  DollarSign,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/core/components/ui/card';
import { StatCard } from '@/core/components/ui/stat-card';
import { paths } from '@/core/config/paths';
import { formatDate, formatMoney } from '@/core/lib/format';
import { SalesChart } from '@/features/passes-dashboard';
import type {
  PaginatedEvents,
  PassesStats,
  PromoterMe,
} from '@/core/types/api';
import type { StripePromoterStatus } from '@/features/stripe';

export const metadata = { title: 'Mi panel' };

export default async function MiPromotoraPage() {
  // PromoterMe es la única llamada que decide el shell del dashboard — si
  // truena (404 → sin organizador) devolvemos el empty state. Las demás
  // llamadas viven en allSettled para no romper la página si el backend
  // todavía no expone el endpoint.
  let me: PromoterMe;
  try {
    me = await serverFetch<PromoterMe>('/promoters/me');
  } catch (err) {
    if (err instanceof ServerApiError && err.status === 404) {
      return (
        <div className="space-y-6">
          <header className="space-y-1">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Mi panel
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Sin organizador asignado
            </h1>
            <p className="text-sm text-muted-foreground">
              Tu cuenta de organizador aún no tiene un perfil vinculado.
              Contacta al administrador de NightPass.
            </p>
          </header>
        </div>
      );
    }
    throw err;
  }

  const promoter = me.promoter;
  const isActive = promoter.status === 'ACTIVE';

  // Rango por defecto: últimos 30 días.
  const to = new Date();
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const nowIso = to.toISOString();

  const [statsRes, eventsRes, stripeRes] = await Promise.allSettled([
    serverFetch<PassesStats>(
      `/promoters/me/stats?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
    ),
    serverFetch<PaginatedEvents>(
      `/events?status=PUBLISHED&fromDate=${encodeURIComponent(nowIso)}&limit=100`,
    ),
    serverFetch<StripePromoterStatus>('/stripe/connect/status-promoter'),
  ]);

  const stats = statsRes.status === 'fulfilled' ? statsRes.value : null;
  const upcomingCount =
    eventsRes.status === 'fulfilled' ? eventsRes.value.items.length : 0;
  const stripeStatus = stripeRes.status === 'fulfilled' ? stripeRes.value : null;

  const stripeReady =
    stripeStatus?.chargesEnabled === true && stripeStatus?.detailsSubmitted === true;
  const stripeHasAccount = !!stripeStatus?.connected;
  const stripeLabel = stripeReady
    ? 'Activo'
    : stripeHasAccount
      ? 'Pendiente'
      : 'No conectado';
  const stripeTrend: 'up' | 'neutral' | 'down' = stripeReady
    ? 'up'
    : stripeHasAccount
      ? 'neutral'
      : 'down';

  const topEvents = stats?.byEvent
    ? [...stats.byEvent].sort((a, b) => b.ingresos - a.ingresos).slice(0, 5)
    : [];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Mi panel
        </p>
        <div className="flex items-start gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Hola, {promoter.name}
          </h1>
          {isActive ? (
            <span className="mt-1.5 flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-400">
              <CheckCircle2 className="size-3" />
              Activa
            </span>
          ) : (
            <span className="mt-1.5 flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
              <PauseCircle className="size-3" />
              Suspendida
            </span>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          Tus eventos · {promoter.city}
        </p>
      </header>

      {/* Row 1 — cuatro stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ingresos último mes"
          value={stats ? formatMoney(stats.totalRevenue) : '—'}
          icon={DollarSign}
          hint={stats ? `${stats.passesSold} pases vendidos` : 'Sin datos aún'}
        />
        <StatCard
          label="Pases vendidos"
          value={stats?.passesSold ?? '—'}
          icon={Ticket}
          hint={
            stats
              ? `${stats.passesRedeemed} canjeados · ${stats.passesPending} pendientes`
              : undefined
          }
        />
        <StatCard
          label="Eventos activos"
          value={upcomingCount}
          icon={Calendar}
          href={paths.miOrganizadorEventos}
          hint="Próximos publicados"
        />
        <StatCard
          label="Stripe"
          value={stripeLabel}
          icon={CreditCard}
          href={me.membershipRole === 'OWNER' ? paths.miOrganizadorPagos : undefined}
          trend={stripeTrend}
          hint={
            stripeReady
              ? 'Cobrando con normalidad'
              : stripeHasAccount
                ? 'Faltan datos en Stripe'
                : 'Conecta para cobrar'
          }
        />
      </section>

      {/* Row 2 — gráfico de ventas */}
      <section>
        <Card className="rounded-[22px] border border-white/10 bg-white/[0.025]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Ventas — últimos 30 días</CardTitle>
              <span className="text-xs text-muted-foreground">
                {formatDate(fromIso, { short: true })} — {formatDate(toIso, { short: true })}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {stats ? (
              <SalesChart data={stats.dailySeries} />
            ) : (
              <div className="flex h-[260px] items-center justify-center rounded-[18px] border border-dashed border-white/10 text-sm text-muted-foreground">
                Sin datos para mostrar todavía
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Row 3 — próximo evento + top eventos */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card className="rounded-[22px] border border-white/10 bg-white/[0.025]">
          <CardHeader>
            <CardTitle className="text-base">Próximo evento</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.upcomingEvent ? (
              <Link
                href={`${paths.miOrganizadorEventos}/${stats.upcomingEvent.id}`}
                className="group block rounded-[18px] border border-white/8 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.05]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  {formatDate(stats.upcomingEvent.startsAt, { time: true })}
                </p>
                <h3 className="mt-1 font-display text-xl font-semibold tracking-tight">
                  {stats.upcomingEvent.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {stats.upcomingEvent.vendidos} pases vendidos hasta ahora
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 group-hover:transition-all">
                  Ver detalle <ArrowRight className="size-3" />
                </span>
              </Link>
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/10 p-4 text-sm text-muted-foreground">
                <p>No hay eventos próximos publicados.</p>
                <Link
                  href={paths.miOrganizadorEventosNuevo}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-primary/30 transition-opacity hover:opacity-90"
                >
                  <Plus className="size-3" />
                  Crear evento
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[22px] border border-white/10 bg-white/[0.025]">
          <CardHeader>
            <CardTitle className="text-base">Top eventos por ventas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topEvents.length > 0 ? (
              <div className="overflow-hidden rounded-b-[22px]">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/8 bg-white/[0.02] text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Evento</th>
                      <th className="px-5 py-2.5 text-right font-medium">Vendidos</th>
                      <th className="px-5 py-2.5 text-right font-medium">Canjeados</th>
                      <th className="px-5 py-2.5 text-right font-medium">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topEvents.map((ev) => (
                      <tr
                        key={ev.eventId}
                        className="border-b border-white/5 last:border-0 hover:bg-white/[0.04]"
                      >
                        <td className="px-5 py-3">
                          <Link
                            href={`${paths.miOrganizadorEventos}/${ev.eventId}`}
                            className="block max-w-[28ch] truncate font-medium text-foreground hover:text-primary"
                          >
                            {ev.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(ev.startsAt, { time: true })}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          {ev.vendidos}
                          {ev.capacity ? (
                            <span className="text-xs text-muted-foreground">
                              /{ev.capacity}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                          {ev.canjeados}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          {formatMoney(ev.ingresos)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-6 text-sm text-muted-foreground">
                Aún no hay ventas registradas en este periodo.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Acciones rápidas */}
      <Card className="rounded-[22px] border border-white/10 bg-white/[0.025]">
        <CardHeader>
          <CardTitle className="text-base">Acciones rápidas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          <Link
            href={paths.miOrganizadorEventosNuevo}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-4 py-1.5 font-semibold text-white shadow-lg shadow-primary/30 transition-opacity hover:opacity-90"
          >
            <Plus className="size-3.5" />
            Crear evento
          </Link>
          {me.membershipRole === 'OWNER' ? (
            <>
              <Link
                href={paths.miOrganizadorEditar}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-4 py-1.5 font-medium text-primary transition-colors hover:bg-primary/25"
              >
                <Pencil className="size-3.5" />
                Editar perfil
              </Link>
              <Link
                href={paths.miOrganizadorPagos}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-4 py-1.5 font-medium text-primary transition-colors hover:bg-primary/25"
              >
                <CreditCard className="size-3.5" />
                Pagos
              </Link>
            </>
          ) : null}
          <Link
            href={paths.miOrganizadorEventos}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-accent-foreground"
          >
            <Calendar className="size-3.5" />
            Ver eventos
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
