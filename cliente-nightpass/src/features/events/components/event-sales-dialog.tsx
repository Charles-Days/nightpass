'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { useEventSales } from '../hooks/use-event-sales';

interface Props {
  eventId: string | null;
  eventTitle?: string;
  onClose: () => void;
}

function formatMoney(cents: number, currency: string) {
  const symbol =
    currency === 'MXN' ? '$' : currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '';
  return `${symbol}${(cents / 100).toFixed(2)} ${currency}`;
}

export function EventSalesDialog({ eventId, eventTitle, onClose }: Props) {
  const sales = useEventSales(eventId ?? undefined, !!eventId);

  return (
    <Dialog open={!!eventId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ventas — {eventTitle ?? 'Evento'}</DialogTitle>
        </DialogHeader>

        {sales.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando ventas…</p>
        ) : null}

        {sales.error ? (
          <p className="text-sm text-amber-300">
            No se pudieron cargar las ventas: {(sales.error as Error).message}
          </p>
        ) : null}

        {sales.data ? (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <Stat
                label="Recaudado"
                value={formatMoney(sales.data.totalCents, sales.data.currency)}
              />
              <Stat label="Órdenes" value={sales.data.orderCount.toString()} />
              <Stat
                label="Pases emitidos"
                value={sales.data.passesIssued.toString()}
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary/70">
                Por tier
              </p>
              <div className="space-y-1.5">
                {sales.data.byTier.map((t) => (
                  <div
                    key={t.tierId}
                    className="flex items-center justify-between rounded-lg border border-white/14 bg-white/[0.035] px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="text-muted-foreground">
                      {t.sold}
                      {t.capacity ? ` / ${t.capacity}` : ''} ·{' '}
                      {formatMoney(t.priceCents, t.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary/70">
                Últimas órdenes
              </p>
              {sales.data.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay ventas para este evento.
                </p>
              ) : (
                <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                  {sales.data.orders.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between rounded-lg border border-white/14 bg-white/[0.035] px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {o.user.name ?? o.user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {o.tier.name} ·{' '}
                          {new Date(o.createdAt).toLocaleString('es-MX', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatMoney(o.totalCents, o.currency)}
                        </p>
                        <p
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            o.passUsed ? 'text-amber-300' : 'text-emerald-300'
                          }`}
                        >
                          {o.passUsed ? 'Usado' : 'Activo'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-white/14 bg-white/[0.05] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
        {label}
      </p>
      <p className="mt-1 bg-gradient-to-br from-white to-purple-200 bg-clip-text font-display text-xl font-bold text-transparent">
        {value}
      </p>
    </div>
  );
}
