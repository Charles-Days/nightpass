'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Inbox, Loader2, MapPin, Mail, Phone, StickyNote, User } from 'lucide-react';
import { clientFetch } from '@/core/lib/api/client-client';
import { formatCents } from '@/core/lib/utils/fees';

// Estados de una solicitud de pago en efectivo.
type RequestStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';

interface RpRequest {
  id: string;
  status: RequestStatus;
  quantity: number;
  amountCents: number;
  currency: string;
  contactPhone: string | null;
  note: string | null;
  eventTitle: string;
  tierName: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerCity: string | null;
  customerState: string | null;
  createdAt: string;
  pickupAt: string | null;
}

interface RpRequestsGroup {
  rpProfileId: string;
  displayName: string;
  rpCode: string;
  isActive: boolean;
  email: string;
  counts: {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    expired: number;
  };
  requests: RpRequest[];
}

const STATUS_META: Record<RequestStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pendiente', className: 'border-amber-400/30 bg-amber-400/10 text-amber-200' },
  CONFIRMED: { label: 'Confirmada', className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' },
  CANCELLED: { label: 'Cancelada', className: 'border-red-400/30 bg-red-400/10 text-red-200' },
  EXPIRED: { label: 'Expirada', className: 'border-white/14 bg-white/[0.04] text-muted-foreground' },
};

function StatusBadge({ status }: { status: RequestStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MiOrganizadorSolicitudesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['rp', 'promoter', 'requests'],
    queryFn: () =>
      clientFetch<{ items: RpRequestsGroup[] }>('/api/rp/promoter/requests'),
  });

  const groups = data?.items ?? [];
  const totalPending = groups.reduce((acc, g) => acc + g.counts.pending, 0);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          RP
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Solicitudes RP
        </h1>
        <p className="text-sm text-muted-foreground">
          Solicitudes de pago en efectivo que han llegado a cada uno de tus RPs.
          {totalPending > 0 ? (
            <span className="ml-1 font-semibold text-amber-200">
              {totalPending} pendiente{totalPending === 1 ? '' : 's'} de cobro.
            </span>
          ) : null}
        </p>
      </header>

      {isLoading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando solicitudes…
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-white/14 bg-white/[0.02] p-10 text-center">
          <Inbox className="mx-auto mb-3 size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No tienes RPs registrados todavía. Crea uno en la sección RPs.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div
              key={group.rpProfileId}
              className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025]"
            >
              {/* Cabecera del RP + conteos */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 bg-white/[0.02] px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {group.displayName}{' '}
                    <span className="font-mono text-[11px] text-primary/70">
                      {group.rpCode}
                    </span>
                    {!group.isActive && (
                      <span className="ml-2 rounded-full border border-white/14 bg-white/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground">
                        Inactivo
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{group.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-muted-foreground">
                    {group.counts.total} total
                  </span>
                  {group.counts.pending > 0 && (
                    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 font-semibold text-amber-200">
                      {group.counts.pending} pendientes
                    </span>
                  )}
                  {group.counts.confirmed > 0 && (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 font-semibold text-emerald-200">
                      {group.counts.confirmed} confirmadas
                    </span>
                  )}
                </div>
              </div>

              {/* Listado de solicitudes */}
              {group.requests.length === 0 ? (
                <p className="px-5 py-6 text-center text-xs text-muted-foreground">
                  Sin solicitudes para este RP.
                </p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {group.requests.map((req) => (
                    <li
                      key={req.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-white/[0.03]"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="truncate text-sm font-medium text-white">
                          {req.eventTitle}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {req.tierName} · {req.quantity}×
                          </span>
                        </p>
                        {/* Info completa del cliente que pidió los boletos */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1 font-medium text-white/90">
                            <User className="size-3" />
                            {req.customerName || 'Cliente sin nombre'}
                          </span>
                          {req.customerEmail && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="size-3" />
                              {req.customerEmail}
                            </span>
                          )}
                          {(req.contactPhone || req.customerPhone) && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="size-3" />
                              {req.contactPhone || req.customerPhone}
                            </span>
                          )}
                          {(req.customerCity || req.customerState) && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3" />
                              {[req.customerCity, req.customerState]
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          )}
                          <span>{formatDate(req.createdAt)}</span>
                        </div>
                        {req.note && (
                          <p className="inline-flex max-w-full items-start gap-1 text-[11px] italic text-muted-foreground/80">
                            <StickyNote className="mt-0.5 size-3 shrink-0" />
                            <span className="min-w-0">{req.note}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-white">
                          {formatCents(req.amountCents, req.currency)}
                        </span>
                        <StatusBadge status={req.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
