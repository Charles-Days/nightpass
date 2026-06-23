'use client';

import {
  ChevronDown,
  Loader2,
  Mail,
  MapPin,
  Phone,
  StickyNote,
  TrendingUp,
  User,
} from 'lucide-react';
import {
  useEventRpBreakdown,
  type EventRpBreakdownRow,
} from '../hooks/use-rp';

const money = (cents: number, currency = 'MXN') =>
  `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;

const REQ_STATUS_META: Record<
  EventRpBreakdownRow['cashRequests'][number]['status'],
  { label: string; className: string }
> = {
  PENDING: {
    label: 'Pendiente',
    className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
  },
  CONFIRMED: {
    label: 'Confirmada',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  },
  CANCELLED: {
    label: 'Cancelada',
    className: 'border-white/14 bg-white/[0.04] text-white/50',
  },
  EXPIRED: {
    label: 'Expirada',
    className: 'border-white/14 bg-white/[0.04] text-white/50',
  },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Lista expandible de las solicitudes de efectivo de un RP con la info del
 *  cliente que pidió los boletos. Usa <details> nativo — sin estado. */
function CashRequestsList({
  requests,
}: {
  requests: EventRpBreakdownRow['cashRequests'];
}) {
  if (!requests || requests.length === 0) return null;
  return (
    <details className="group mt-2 border-t border-white/8 pt-2">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold text-primary transition hover:text-primary/80">
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
        Ver clientes ({requests.length})
      </summary>
      <ul className="mt-2 space-y-2">
        {requests.map((r) => {
          const meta = REQ_STATUS_META[r.status];
          const phone = r.contactPhone || r.customerPhone;
          const loc = [r.customerCity, r.customerState]
            .filter(Boolean)
            .join(', ');
          return (
            <li
              key={r.id}
              className="rounded-lg border border-white/8 bg-black/20 px-2.5 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-white">
                  <User className="size-3.5 text-primary/70" />
                  {r.customerName || 'Cliente sin nombre'}
                </p>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}
                >
                  {meta.label}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {r.customerEmail && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-3" />
                    {r.customerEmail}
                  </span>
                )}
                {phone && (
                  <a
                    href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-300 hover:underline"
                  >
                    <Phone className="size-3" />
                    {phone}
                  </a>
                )}
                {loc && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" />
                    {loc}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/60">
                <span>
                  {r.tierName ? `${r.tierName} · ` : ''}
                  {r.quantity}× · {money(r.amountCents, r.currency)}
                </span>
                <span>{fmtDate(r.createdAt)}</span>
              </div>
              {r.note && (
                <p className="mt-1 inline-flex items-start gap-1 text-[11px] italic text-white/55">
                  <StickyNote className="mt-0.5 size-3 shrink-0" />
                  <span className="min-w-0">{r.note}</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

/** Describe la regla de comisión de forma corta y legible. */
function commissionLabel(c: EventRpBreakdownRow['commission']): string {
  if (!c) return 'Sin comisión';
  if (c.type === 'PERCENTAGE' && c.percentage != null) {
    return `${c.percentage}% por venta`;
  }
  if (c.type === 'PER_N_TICKETS' && c.nTickets && c.rewardCents != null) {
    return `${money(c.rewardCents, c.currency)} por cada ${c.nTickets} boletos`;
  }
  return 'Sin comisión';
}

/**
 * Gestión (admin / organizador): por evento, cada RP con su comisión, sus ventas
 * atribuidas y sus ganancias. `promoter` usa la ruta scoped del organizador.
 */
export function EventRpBreakdown({
  eventId,
  promoter = false,
}: {
  eventId: string;
  promoter?: boolean;
}) {
  const { data, isLoading, isError } = useEventRpBreakdown(eventId, { promoter });

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
        <Loader2 className="size-4 animate-spin" /> Cargando…
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-muted-foreground py-4 text-sm">
        No se pudo cargar el desglose de RPs.
      </p>
    );
  }

  const rps = data?.rps ?? [];

  if (rps.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed border-white/14 bg-white/[0.02] p-6 text-center text-sm">
        Aún no hay RPs vendiendo este evento. Asígnalos o crea reglas de comisión.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Totales */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/12 bg-white/[0.03] p-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
            Efectivo confirmado
          </p>
          <p className="font-display mt-0.5 text-xl font-bold text-emerald-400">
            {money(data?.totals.cashConfirmedCents ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-white/12 bg-white/[0.03] p-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
            Efectivo pendiente
          </p>
          <p className="font-display mt-0.5 text-xl font-bold text-yellow-400">
            {data?.totals.cashPending ?? 0}{' '}
            <span className="text-xs font-normal text-white/50">
              {(data?.totals.cashPending ?? 0) === 1 ? 'cobro' : 'cobros'}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-white/12 bg-white/[0.03] p-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
            Ventas por link
          </p>
          <p className="font-display mt-0.5 text-xl font-bold text-white">
            {data?.totals.sales ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-white/12 bg-white/[0.03] p-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
            Comisiones a pagar
          </p>
          <p className="font-display mt-0.5 text-xl font-bold text-emerald-400">
            {money(data?.totals.earningsCents ?? 0)}
          </p>
        </div>
      </div>

      {/* Lista por RP */}
      <div className="space-y-2">
        {rps.map((rp) => (
          <div
            key={rp.rpProfileId}
            className="rounded-xl border border-white/12 bg-white/[0.025] p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  {rp.displayName}
                  <span className="font-mono text-[11px] text-primary/70">
                    {rp.rpCode}
                  </span>
                  {!rp.isActive && (
                    <span className="rounded-full border border-white/14 px-1.5 text-[10px] text-white/50">
                      inactivo
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {rp.email}
                </p>
              </div>
              <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold">
                <TrendingUp className="size-3" />
                {rp.sales} {rp.sales === 1 ? 'venta' : 'ventas'}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-black/20 px-2.5 py-1.5">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">
                  Comisión {rp.commission?.scope === 'global' ? '(global)' : ''}
                </p>
                <p className="mt-0.5 text-white/85">
                  {commissionLabel(rp.commission)}
                </p>
              </div>
              <div className="rounded-lg bg-black/20 px-2.5 py-1.5">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">
                  Ganancia
                </p>
                <p className="mt-0.5 font-semibold text-emerald-400">
                  {money(rp.earningsCents)}
                </p>
              </div>
            </div>

            {/* Cobros en efectivo asignados a este RP, con su estado. */}
            {rp.assigned && (
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/8 pt-2">
                <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                  Efectivo:
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                  {rp.cash.confirmed} confirmadas
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[11px] font-semibold text-yellow-300">
                  {rp.cash.pending} pendientes
                </span>
                {rp.cash.cancelled > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/[0.04] px-2 py-0.5 text-[11px] font-semibold text-white/50">
                    {rp.cash.cancelled} canceladas
                  </span>
                )}
                {rp.cash.confirmedAmountCents > 0 && (
                  <span className="ml-auto text-[11px] font-semibold text-emerald-400">
                    {money(rp.cash.confirmedAmountCents)} cobrado
                  </span>
                )}
              </div>
            )}

            {/* Clientes que pidieron boletos a este RP (info completa). */}
            <CashRequestsList requests={rp.cashRequests} />

            {/* Vales que generó, por forma. Muestra si usó link o QR y cuántos
                reclamaron. */}
            {(() => {
              const link = rp.passes?.link ?? { emitted: 0, claimed: 0 };
              const qr = rp.passes?.qr ?? { emitted: 0, claimed: 0 };
              if (link.emitted === 0 && qr.emitted === 0) return null;
              return (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/8 pt-2">
                  <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                    Vales:
                  </span>
                  {link.emitted > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-300">
                      Link {link.claimed}/{link.emitted} reclamados
                    </span>
                  )}
                  {qr.emitted > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      QR {qr.claimed}/{qr.emitted} reclamados
                    </span>
                  )}
                  {link.emitted === 0 && (
                    <span className="text-[11px] text-white/40">sin link</span>
                  )}
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
