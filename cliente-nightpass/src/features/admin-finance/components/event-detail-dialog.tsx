'use client';

import {
  Banknote,
  Coins,
  CreditCard,
  MapPin,
  ScanLine,
  Ticket,
  Users,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import type { AdminEventDetail } from '@/core/types/api';
import { useAdminEventDetail } from '../hooks/use-event-detail';

const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});
function money(cents: number) {
  return mxn.format((cents ?? 0) / 100);
}
function pct(ratio: number) {
  return `${Math.round((ratio ?? 0) * 100)}%`;
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}
function dayLabel(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
  });
}

const CARD = '#a855f7';
const CASH = '#10b981';

// ─── Sub-componentes ──────────────────────────────────────────────────────

function Stat({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'text-white',
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <Icon className="size-3.5 text-primary/60" />
      </div>
      <p className={`mt-2 font-display text-2xl font-bold ${accent}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Donut tarjeta vs efectivo con conic-gradient. */
function PaymentDonut({ card, cash }: { card: number; cash: number }) {
  const total = card + cash;
  const cardPct = total > 0 ? (card / total) * 100 : 0;
  const cashPct = total > 0 ? (cash / total) * 100 : 0;
  return (
    <div className="flex items-center gap-5">
      <div
        className="relative size-28 shrink-0 rounded-full"
        style={{
          background:
            total > 0
              ? `conic-gradient(${CARD} 0 ${cardPct}%, ${CASH} ${cardPct}% 100%)`
              : 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-[#0a0a0f]">
          <span className="font-display text-xl font-bold">{total}</span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">pases</span>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: CARD }} />
          <span className="text-muted-foreground">Tarjeta</span>
          <span className="font-semibold">{card}</span>
          <span className="text-xs text-muted-foreground">({Math.round(cardPct)}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: CASH }} />
          <span className="text-muted-foreground">Efectivo</span>
          <span className="font-semibold">{cash}</span>
          <span className="text-xs text-muted-foreground">({Math.round(cashPct)}%)</span>
        </div>
      </div>
    </div>
  );
}

/** Barras diarias apiladas tarjeta + efectivo. */
function DailyBars({ daily }: { daily: AdminEventDetail['daily'] }) {
  if (daily.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin ventas registradas.</p>;
  }
  const max = Math.max(1, ...daily.map((d) => d.card + d.cash));
  return (
    <div>
      <div className="flex h-36 items-end gap-1.5">
        {daily.map((d) => {
          const cardH = (d.card / max) * 100;
          const cashH = (d.cash / max) * 100;
          return (
            <div key={d.day} className="group flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="relative flex h-full w-full flex-col justify-end">
                <div
                  className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-white/10 bg-[#13131a] px-2 py-1 text-[10px] opacity-0 shadow-lg transition group-hover:opacity-100"
                >
                  {d.card + d.cash} pases · {money(d.revenueCents)}
                </div>
                <div
                  className="w-full rounded-t-sm"
                  style={{ height: `${cashH}%`, background: CASH }}
                />
                <div
                  className="w-full"
                  style={{ height: `${cardH}%`, background: CARD }}
                />
              </div>
              <span className="w-full truncate text-center text-[9px] text-muted-foreground">
                {dayLabel(d.day)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: CARD }} /> Tarjeta
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: CASH }} /> Efectivo
        </span>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
      {children}
    </h4>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────

export function EventDetailDialog({
  eventId,
  onClose,
}: {
  eventId: string | null;
  onClose: () => void;
}) {
  const { data, isLoading, isError, error } = useAdminEventDetail(eventId);

  return (
    <Dialog open={!!eventId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-hidden border-white/10 bg-[#0a0a0f] p-0 sm:max-w-3xl">
        <div className="flex max-h-[88vh] flex-col">
          <DialogHeader className="shrink-0 border-b border-white/10 px-4 pb-4 pt-5 sm:px-6">
            <DialogTitle className="font-display text-lg">
              {data?.event.title ?? 'Detalle del evento'}
            </DialogTitle>
            {data ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{fmtDateTime(data.event.startsAt)}</span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3" />
                  {data.event.organizerName}
                </span>
                {data.event.city ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" />
                    {data.event.city}
                  </span>
                ) : null}
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wide">
                  {data.event.status}
                </span>
              </div>
            ) : null}
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
                <div className="h-40 animate-pulse rounded-2xl bg-white/[0.04]" />
                <div className="h-40 animate-pulse rounded-2xl bg-white/[0.04]" />
              </div>
            ) : isError ? (
              <p className="text-sm text-destructive">
                {(error as Error)?.message ?? 'Error al cargar el detalle.'}
              </p>
            ) : data ? (
              <div className="space-y-7">
                {/* KPIs */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat
                    label="Pases vendidos"
                    value={data.summary.soldTotal}
                    hint={
                      data.summary.pendingCash > 0
                        ? `Tarjeta ${data.summary.soldCard} · Efectivo ${data.summary.soldCash} · ${data.summary.pendingCash} pend. canje`
                        : `Tarjeta ${data.summary.soldCard} · Efectivo ${data.summary.soldCash}`
                    }
                    icon={Ticket}
                  />
                  <Stat
                    label="Ingreso total"
                    value={money(data.summary.revenueTotalCents)}
                    hint={`${money(data.summary.revenueCardCents)} + ${money(
                      data.summary.revenueCashCents,
                    )} efvo`}
                    icon={Banknote}
                  />
                  <Stat
                    label="Canjeados"
                    value={`${data.summary.redeemedTotal}/${data.summary.soldTotal}`}
                    hint={`${pct(data.summary.redeemRate)} canje`}
                    icon={ScanLine}
                    accent="text-[#10b981]"
                  />
                  <Stat
                    label="Aforo"
                    value={
                      data.event.capacity != null
                        ? `${data.summary.fillRate != null ? pct(data.summary.fillRate) : '—'}`
                        : '—'
                    }
                    hint={
                      data.event.capacity != null
                        ? `${data.summary.soldTotal} / ${data.event.capacity}`
                        : 'Sin límite'
                    }
                    icon={Users}
                  />
                </div>

                {/* Donut + cash detail */}
                <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:grid-cols-2">
                  <div>
                    <SectionTitle>Mezcla de pago</SectionTitle>
                    <PaymentDonut card={data.summary.soldCard} cash={data.summary.soldCash} />
                  </div>
                  <div className="space-y-2.5 sm:border-l sm:border-white/10 sm:pl-5">
                    <SectionTitle>Efectivo (RP)</SectionTitle>
                    <div className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Coins className="size-3.5 text-[#10b981]" /> Cobrado (reclamado)
                      </span>
                      <span className="font-semibold text-[#10b981]">
                        {money(data.summary.revenueCashCents)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Reclamados</span>
                      <span>{data.summary.cashClaimed}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-amber-300/80">Pendiente de cobro</span>
                      <span className="text-amber-300/90">
                        {data.summary.pendingCash} · {money(data.summary.pendingCashCents)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <CreditCard className="size-3.5 text-primary" /> Fee Stripe (tarjeta)
                      </span>
                      <span>{money(data.summary.feesCents)}</span>
                    </div>
                  </div>
                </section>

                {/* Daily chart */}
                <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                  <SectionTitle>Ventas por día</SectionTitle>
                  <DailyBars daily={data.daily} />
                </section>

                {/* Tiers */}
                <section>
                  <SectionTitle>Por tier</SectionTitle>
                  {data.byTier.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Este evento no tiene tiers.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-white/10">
                      <table className="w-full min-w-[34rem] text-left text-sm">
                        <thead className="border-b border-white/8 bg-white/[0.02] text-[10px] uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">Tier</th>
                            <th className="px-3 py-2 font-medium">Precio</th>
                            <th className="px-3 py-2 font-medium">Tarjeta</th>
                            <th className="px-3 py-2 font-medium">Efectivo</th>
                            <th className="px-3 py-2 font-medium">Total</th>
                            <th className="px-3 py-2 text-right font-medium">Ingreso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.byTier.map((t) => (
                            <tr key={t.tierId} className="border-b border-white/5 last:border-b-0">
                              <td className="px-3 py-2 font-medium">{t.name}</td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {money(t.priceCents)}
                              </td>
                              <td className="px-3 py-2" style={{ color: CARD }}>
                                {t.soldCard}
                              </td>
                              <td className="px-3 py-2" style={{ color: CASH }}>
                                {t.soldCash}
                              </td>
                              <td className="px-3 py-2 font-medium">
                                {t.soldTotal}
                                {t.capacity != null ? (
                                  <span className="text-xs text-muted-foreground"> / {t.capacity}</span>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 text-right text-muted-foreground">
                                {money(t.revenueCents)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* RPs */}
                {data.byRp.length > 0 ? (
                  <section>
                    <SectionTitle>Vales en efectivo por RP</SectionTitle>
                    <p className="mb-3 text-[11px] text-muted-foreground">
                      <span className="text-foreground/80">Emitido</span> = el RP generó el
                      vale (QR/link). <span className="text-emerald-300/90">Reclamado</span> = un
                      cliente lo abrió y guardó su boleto (venta real). Lo emitido aún sin reclamar
                      no es venta todavía.
                    </p>
                    <div className="space-y-2">
                      {data.byRp.map((rp, i) => {
                        const pendientes = Math.max(0, rp.count - rp.claimedCount);
                        return (
                          <div
                            key={rp.rpId}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2.5"
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex size-6 items-center justify-center rounded-full bg-amber-500/15 text-[11px] font-bold text-amber-300">
                                {i + 1}
                              </span>
                              <div>
                                <p className="text-sm font-medium">{rp.name}</p>
                                <p className="text-[11px] text-muted-foreground">{rp.rpCode}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">
                                <span className="text-foreground">{rp.count} emitidos</span>
                                <span className="text-muted-foreground"> · </span>
                                <span className="text-[#10b981]">{rp.claimedCount} reclamados</span>
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {money(rp.claimedRevenueCents)} real
                                {pendientes > 0
                                  ? ` · ${money(rp.revenueCents - rp.claimedRevenueCents)} pendiente`
                                  : ''}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {/* Recent orders */}
                <section>
                  <SectionTitle>Últimas órdenes</SectionTitle>
                  {data.recentOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin órdenes.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-white/10">
                      <table className="w-full min-w-[34rem] text-left text-sm">
                        <thead className="border-b border-white/8 bg-white/[0.02] text-[10px] uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">Cliente</th>
                            <th className="px-3 py-2 font-medium">Método</th>
                            <th className="px-3 py-2 font-medium">Tier</th>
                            <th className="px-3 py-2 font-medium">Total</th>
                            <th className="px-3 py-2 font-medium">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.recentOrders.map((o) => (
                            <tr key={o.id} className="border-b border-white/5 last:border-b-0">
                              <td className="px-3 py-2">
                                <p className="font-medium">{o.userName ?? o.userEmail}</p>
                                {o.userName ? (
                                  <p className="text-[11px] text-muted-foreground">{o.userEmail}</p>
                                ) : null}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                                  style={{
                                    background:
                                      o.method === 'Efectivo'
                                        ? 'rgba(16,185,129,0.15)'
                                        : 'rgba(168,85,247,0.15)',
                                    color: o.method === 'Efectivo' ? '#6ee7b7' : '#d8b4fe',
                                  }}
                                >
                                  {o.method}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{o.tierName}</td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {money(o.totalCents)}
                              </td>
                              <td className="px-3 py-2">
                                {o.redeemed ? (
                                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                                    Canjeado
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    Pendiente
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
