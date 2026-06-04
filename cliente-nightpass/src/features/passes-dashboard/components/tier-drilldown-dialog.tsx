'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/core/components/ui/dialog';
import { useEventDrilldown } from '../hooks/use-event-drilldown';
import type { EventTierBreakdownTier, EventTierBreakdownOrder } from '@/core/types/api';

const mxnFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function fmtEventDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TierRow({ tier }: { tier: EventTierBreakdownTier }) {
  const cap = tier.capacity ?? null;
  const pct = cap && cap > 0 ? Math.min(100, Math.round((tier.sold / cap) * 100)) : null;

  return (
    <tr className="border-b border-white/10 last:border-b-0">
      <td className="px-3 py-2 font-medium">{tier.name}</td>
      <td className="px-3 py-2 text-muted-foreground">
        {mxnFormatter.format(tier.priceCents / 100)}
      </td>
      <td className="px-3 py-2 text-muted-foreground">{cap != null ? cap : '—'}</td>
      <td className="px-3 py-2 text-muted-foreground">{tier.sold}</td>
      <td className="px-3 py-2">
        {pct != null ? (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.11]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{pct}%</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

function OrderRow({ order }: { order: EventTierBreakdownOrder }) {
  return (
    <tr className="border-b border-white/10 last:border-b-0">
      <td className="px-3 py-2">
        <p className="font-medium">{order.userName ?? order.userEmail}</p>
        {order.userName ? (
          <p className="text-xs text-muted-foreground">{order.userEmail}</p>
        ) : null}
      </td>
      <td className="px-3 py-2 text-muted-foreground">{order.tierName}</td>
      <td className="px-3 py-2 text-muted-foreground">
        {mxnFormatter.format(order.totalCents / 100)}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDateTime(order.createdAt)}</td>
      <td className="px-3 py-2">
        {order.passUsed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            Canjeado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.09] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Pendiente
          </span>
        )}
      </td>
    </tr>
  );
}

export function TierDrilldownDialog({
  venueId,
  eventId,
  range,
  onClose,
}: {
  venueId: string;
  eventId: string | null;
  range: { from?: string; to?: string };
  onClose: () => void;
}) {
  const { data, isLoading, isError, error } = useEventDrilldown(venueId, eventId, range);

  return (
    <Dialog open={!!eventId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-hidden border-white/14 bg-[#0a0a0f] p-0 sm:max-w-2xl">
        <div className="flex max-h-[85vh] flex-col">
          <DialogHeader className="shrink-0 border-b border-white/14 px-6 pb-4 pt-5">
            <DialogTitle className="font-display text-lg">
              {data?.title ?? 'Detalle del evento'}
            </DialogTitle>
            {data ? (
              <p className="text-xs text-muted-foreground">{fmtEventDate(data.startsAt)}</p>
            ) : null}
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-20 animate-pulse rounded-lg bg-white/[0.07]" />
                <div className="h-40 animate-pulse rounded-lg bg-white/[0.07]" />
              </div>
            ) : isError ? (
              <p className="text-sm text-destructive">
                {(error as Error)?.message ?? 'Error al cargar el detalle.'}
              </p>
            ) : data ? (
              <div className="space-y-6">
                <section>
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                    Tiers
                  </h4>
                  {data.tiers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Este evento no tiene tiers.</p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-white/14">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-white/12 bg-white/[0.035] text-[11px] uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">Tier</th>
                            <th className="px-3 py-2 font-medium">Precio</th>
                            <th className="px-3 py-2 font-medium">Capacidad</th>
                            <th className="px-3 py-2 font-medium">Vendidos</th>
                            <th className="px-3 py-2 font-medium">Progreso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.tiers.map((tier) => (
                            <TierRow key={tier.tierId} tier={tier} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section>
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                    Últimas órdenes
                  </h4>
                  {data.orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin órdenes en el periodo.</p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-white/14">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-white/12 bg-white/[0.035] text-[11px] uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">Cliente</th>
                            <th className="px-3 py-2 font-medium">Tier</th>
                            <th className="px-3 py-2 font-medium">Total</th>
                            <th className="px-3 py-2 font-medium">Fecha</th>
                            <th className="px-3 py-2 font-medium">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.orders.map((order) => (
                            <OrderRow key={order.id} order={order} />
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
