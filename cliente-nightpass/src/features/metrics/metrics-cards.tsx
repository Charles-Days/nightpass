import { Users } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/components/ui/card';
import type { FunnelStats, InsightsStats, VisitorStats } from '@/core/types/api';

export function VisitorsCard({ visitors }: { visitors: VisitorStats }) {
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
    <Card className="rounded-[22px] border border-white/14 bg-white/[0.05]">
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
              <p className="text-[10px] text-muted-foreground">cuentas en la BD</p>
            </div>
          )}

          <div className="ml-auto flex items-end gap-2">
            {visitors.last7.map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] tabular-nums text-white/60">{d.count}</span>
                <div className="flex h-16 w-5 items-end rounded-md bg-white/[0.07]">
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
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/12 pt-4 sm:grid-cols-4">
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
                    <div className="flex h-10 w-4 items-end rounded-md bg-white/[0.07]">
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

export function FunnelCard({ funnel }: { funnel: FunnelStats }) {
  const nf = new Intl.NumberFormat('es-MX');
  const base = Math.max(1, funnel.steps[0]?.visitors ?? 0);
  const hasData = funnel.steps.some((s) => s.visitors > 0);

  const prettyPath = (p: string) =>
    p
      .replace(/^\/app\/evento\/[0-9a-f-]{36}.*/i, '/app/evento/…')
      .replace(/^\/app\/checkout\/.*/i, '/app/checkout/…');

  return (
    <Card className="rounded-[22px] border border-white/14 bg-white/[0.05]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-primary" />
          Recorrido y embudo
        </CardTitle>
        <CardDescription>
          Últimos {funnel.windowDays} días — por dónde entra la gente, cómo avanza
          y dónde se cae antes de crear cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay datos de recorrido. Se empiezan a registrar con las
            visitas a partir de este deploy.
          </p>
        ) : (
          <>
            <div className="space-y-2.5">
              {funnel.steps.map((s, i) => {
                const prev = funnel.steps[i - 1]?.visitors;
                const drop =
                  prev && prev > 0 ? Math.round((1 - s.visitors / prev) * 100) : null;
                const width = Math.round((s.visitors / base) * 100);
                return (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-xs text-muted-foreground">
                      {s.label}
                    </span>
                    <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-white/[0.06]">
                      <div
                        className="flex h-full items-center rounded-lg bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-2"
                        style={{ width: `${Math.max(width, 6)}%` }}
                      >
                        <span className="text-[11px] font-bold tabular-nums text-white">
                          {nf.format(s.visitors)}
                        </span>
                      </div>
                    </div>
                    <span className="w-16 shrink-0 text-right text-[11px] tabular-nums">
                      {drop != null ? (
                        <span className={drop > 0 ? 'text-amber-300' : 'text-emerald-400'}>
                          {drop > 0 ? `−${drop}%` : '0%'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">100%</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 border-t border-white/12 pt-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Por dónde entran
                </p>
                <ul className="space-y-1.5">
                  {funnel.topEntry.length === 0 ? (
                    <li className="text-xs text-muted-foreground">—</li>
                  ) : (
                    funnel.topEntry.map((p) => (
                      <li key={`in-${p.path}`} className="flex items-center justify-between gap-3 text-xs">
                        <code className="min-w-0 truncate text-white/70">{prettyPath(p.path)}</code>
                        <span className="shrink-0 tabular-nums text-muted-foreground">{nf.format(p.count)}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Dónde terminan (abandono)
                </p>
                <ul className="space-y-1.5">
                  {funnel.topExit.length === 0 ? (
                    <li className="text-xs text-muted-foreground">—</li>
                  ) : (
                    funnel.topExit.map((p) => (
                      <li key={`out-${p.path}`} className="flex items-center justify-between gap-3 text-xs">
                        <code className="min-w-0 truncate text-white/70">{prettyPath(p.path)}</code>
                        <span className="shrink-0 tabular-nums text-muted-foreground">{nf.format(p.count)}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function InsightsCard({ insights }: { insights: InsightsStats }) {
  const nf = new Intl.NumberFormat('es-MX');
  const money = (c: number) =>
    `$${(c / 100).toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN`;
  const a = insights.audience;
  const r = insights.redemption;
  const maxSrc = Math.max(1, ...insights.trafficSources.map((s) => s.visitors));

  const Stat = ({
    label,
    value,
    sub,
    tone = 'text-white',
  }: {
    label: string;
    value: string;
    sub?: string;
    tone?: string;
  }) => (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className={`font-display text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
      {sub ? <p className="text-[10px] text-muted-foreground">{sub}</p> : null}
    </div>
  );

  return (
    <Card className="rounded-[22px] border border-white/14 bg-white/[0.05]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-primary" />
          Insights de comportamiento
        </CardTitle>
        <CardDescription>
          Últimos {insights.windowDays} días — tráfico, conversión por evento, canje
          de pases, audiencia e ingresos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Audiencia */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Audiencia
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            <Stat label="Activos hoy" value={nf.format(a.dau)} />
            <Stat label="Semana" value={nf.format(a.wau)} />
            <Stat label="Mes" value={nf.format(a.mau)} />
            <Stat label="Stickiness" value={`${a.stickinessPct}%`} sub="DAU/MAU" tone="text-primary" />
            <Stat label="Recurrentes" value={nf.format(a.returning)} sub="≥2 días" tone="text-emerald-400" />
            <Stat label="Una sola vez" value={nf.format(a.oneTime)} />
          </div>
        </div>

        {/* Canje */}
        <div className="border-t border-white/12 pt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Canje de pases
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Comprados" value={nf.format(r.sold)} />
            <Stat label="Canjeados" value={nf.format(r.redeemed)} tone="text-emerald-400" />
            <Stat label="No-show" value={nf.format(r.noShow)} tone="text-amber-300" />
            <Stat label="Tasa de canje" value={`${r.ratePct}%`} tone="text-primary" />
          </div>
        </div>

        {/* Tráfico */}
        <div className="border-t border-white/12 pt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Por dónde llegan
          </p>
          {insights.trafficSources.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin datos aún.</p>
          ) : (
            <div className="space-y-2">
              {insights.trafficSources.slice(0, 8).map((s) => (
                <div key={s.source} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">{s.source}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-md bg-white/[0.06]">
                    <div
                      className="h-full rounded-md bg-gradient-to-r from-[#9333ea] to-[#a855f7]"
                      style={{ width: `${Math.max(6, Math.round((s.visitors / maxSrc) * 100))}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs tabular-nums">{nf.format(s.visitors)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversión por evento */}
        <div className="border-t border-white/12 pt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Conversión por evento
          </p>
          {insights.eventConversion.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin datos aún.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-2 font-semibold">Evento</th>
                    <th className="py-2 px-2 text-right font-semibold">Vieron</th>
                    <th className="py-2 px-2 text-right font-semibold">Tocaron</th>
                    <th className="py-2 pl-2 text-right font-semibold">Compraron</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.eventConversion.map((e) => (
                    <tr key={e.eventId} className="border-b border-white/5">
                      <td className="max-w-[200px] truncate py-2 pr-2">{e.title}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{nf.format(e.views)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-amber-300">{nf.format(e.clicks)}</td>
                      <td className="py-2 pl-2 text-right tabular-nums text-emerald-400">{nf.format(e.purchases)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ingresos */}
        <div className="border-t border-white/12 pt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Ingresos (órdenes pagadas)
          </p>
          <div className="mb-3 grid grid-cols-2 gap-4">
            <Stat label="Órdenes" value={nf.format(insights.revenue.totalOrders)} />
            <Stat label="Ticket promedio" value={money(insights.revenue.avgTicketCents)} tone="text-emerald-400" />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Por tier</p>
              <ul className="space-y-1">
                {insights.revenue.byTier.length === 0 ? (
                  <li className="text-xs text-muted-foreground">—</li>
                ) : (
                  insights.revenue.byTier.map((t) => (
                    <li key={t.tier} className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate">{t.tier}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {nf.format(t.orders)} · {money(t.revenueCents)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Por método</p>
              <ul className="space-y-1">
                {insights.revenue.byMethod.length === 0 ? (
                  <li className="text-xs text-muted-foreground">—</li>
                ) : (
                  insights.revenue.byMethod.map((m) => (
                    <li key={m.method} className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate">{m.method}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {nf.format(m.orders)} · {money(m.revenueCents)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
