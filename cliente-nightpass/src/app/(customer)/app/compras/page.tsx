import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, MapPin, Receipt, ShoppingBag } from 'lucide-react';
import { serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { OrderHistoryItem, OrderStatus, PaginatedOrders } from '@/core/types/api';

export const metadata = {
  title: 'Mis compras — NightPass',
  description: 'Historial de tus pases comprados y pagos.',
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency || 'MXN',
  }).format(cents / 100);
}

const STATUS: Record<OrderStatus, { label: string; className: string }> = {
  COMPLETED: {
    label: 'Pagado',
    className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  },
  PENDING: {
    label: 'Pendiente',
    className: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  },
  PROCESSING: {
    label: 'Procesando',
    className: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  },
  FAILED: {
    label: 'Fallido',
    className: 'border-red-400/30 bg-red-400/10 text-red-300',
  },
  REFUNDED: {
    label: 'Reembolsado',
    className: 'border-white/15 bg-white/[0.05] text-white/60',
  },
};

export default async function ComprasPage() {
  let orders: OrderHistoryItem[] = [];
  try {
    const data = await serverFetch<PaginatedOrders>('/orders/me?page=1&limit=50');
    orders = Array.isArray(data?.items) ? data.items : [];
  } catch {
    orders = [];
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8 sm:py-10">
      <Link
        href={paths.perfil}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground active:scale-95 transform-gpu"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>

      <p className="mt-6 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary np-rise">
        Tu cuenta · historial
      </p>
      <h1
        className="mt-2 font-display text-3xl font-bold leading-tight tracking-[-0.02em] sm:text-4xl np-rise"
        style={{ animationDelay: '60ms' }}
      >
        Mis compras
      </h1>
      <p
        className="mt-2 max-w-lg text-sm text-muted-foreground np-rise"
        style={{ animationDelay: '120ms' }}
      >
        Todos tus pases comprados y el estado de cada pago.
      </p>

      {orders.length === 0 ? (
        <div
          className="mt-8 flex flex-col items-center rounded-[22px] border border-white/10 bg-white/[0.025] p-10 text-center np-rise"
          style={{ animationDelay: '180ms' }}
        >
          <div className="grid size-14 place-items-center rounded-full border border-white/10 bg-white/[0.04] np-pop-in">
            <ShoppingBag className="size-6 text-primary" />
          </div>
          <h2 className="mt-5 font-display text-lg font-bold tracking-tight">
            Aún no tienes compras
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Cuando compres un pase aparecerá aquí con su importe y estado.
          </p>
          <Link
            href={paths.buscar}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)] transition hover:brightness-110 active:scale-95 transform-gpu"
          >
            Explorar eventos
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {orders.map((order, idx) => {
            const event = order.event;
            const venue = event?.venue;
            const status = STATUS[order.status] ?? STATUS.PENDING;
            return (
              <li
                key={order.id}
                className="np-rise transform-gpu"
                style={{ animationDelay: `${Math.min(80 + idx * 40, 480)}ms` }}
              >
                <div className="flex items-stretch gap-4 rounded-[20px] border border-white/10 bg-white/[0.025] p-3 sm:p-4">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[14px] bg-gradient-to-br from-purple-900/40 to-purple-600/10 sm:h-28 sm:w-32">
                    {event?.coverImageUrl ? (
                      <Image
                        src={event.coverImageUrl}
                        alt={event.title}
                        fill
                        sizes="128px"
                        loading="lazy"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-white/30">
                        <Receipt className="size-7" />
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-display text-base font-bold leading-tight tracking-tight sm:text-lg">
                        {event?.title ?? 'Pase'}
                      </h3>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    {venue && (
                      <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">{venue.name}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar className="size-3 shrink-0" />
                      {formatDate(order.createdAt)}
                    </p>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <span className="font-display text-lg font-bold tracking-tight">
                        {formatMoney(order.totalCents, order.currency)}
                      </span>
                      {order.tier?.name && (
                        <span className="truncate text-[11px] text-white/40">
                          {order.tier.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
