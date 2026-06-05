'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Loader2, Banknote, Check, X, Clock, Search } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { ConfirmDialog } from '@/core/components/ui/confirm-dialog';
import { ClientApiError } from '@/core/lib/api/client-client';
import {
  useRpPhysicalRequests,
  useConfirmPhysicalRequest,
  useCancelPhysicalRequest,
  type PhysicalPaymentRequest,
} from '../hooks/use-rp';

const money = (cents: number, currency: string) =>
  `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;

/** Extrae el mensaje del backend (p.ej. "saldo insuficiente") para el toast. */
function confirmErrorMessage(e: unknown): string {
  if (e instanceof ClientApiError && e.payload && typeof e.payload === 'object') {
    const msg = (e.payload as { message?: unknown }).message;
    if (typeof msg === 'string' && msg) return msg;
    if (Array.isArray(msg) && msg.length) return String(msg[0]);
  }
  return 'No se pudo confirmar';
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Pendiente', cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  CONFIRMED: { label: 'Confirmada', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  CANCELLED: { label: 'Cancelada', cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
  EXPIRED: { label: 'Vencida', cls: 'text-white/40 bg-white/5 border-white/14' },
};

/**
 * Cola de solicitudes de PAGO EN EFECTIVO de los eventos asignados al RP. Al
 * confirmar, el backend emite el/los pase(s) directo a la cuenta del cliente.
 */
export function PhysicalRequestsSection() {
  const { data, isLoading } = useRpPhysicalRequests();
  const confirm = useConfirmPhysicalRequest();
  const cancel = useCancelPhysicalRequest();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  // Solicitud pendiente de confirmar (abre el modal "¿ya te pagó?").
  const [confirming, setConfirming] = React.useState<PhysicalPaymentRequest | null>(null);

  const doConfirm = () => {
    const r = confirming;
    if (!r) return;
    setBusyId(r.id);
    confirm.mutate(r.id, {
      onSuccess: () => {
        toast.success('Pago confirmado · pase emitido al cliente');
        setConfirming(null);
      },
      onError: (e) => toast.error(confirmErrorMessage(e)),
      onSettled: () => setBusyId(null),
    });
  };

  const onCancel = (r: PhysicalPaymentRequest) => {
    setBusyId(r.id);
    cancel.mutate(r.id, {
      onSuccess: () => toast.success('Solicitud cancelada'),
      onError: () => toast.error('No se pudo cancelar'),
      onSettled: () => setBusyId(null),
    });
  };

  const [query, setQuery] = React.useState('');

  const allItems = data?.items ?? [];
  const q = query.trim().toLowerCase();
  const items = q
    ? allItems.filter((r) => {
        const haystack = [
          r.customer?.name,
          r.customer?.email,
          r.contactPhone,
          r.event.title,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
    : allItems;
  const pending = items.filter((r) => r.status === 'PENDING');
  const rest = items.filter((r) => r.status !== 'PENDING');
  const pendingTotal = allItems.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <Banknote className="size-4 text-primary" />
        <h3 className="font-display text-lg font-bold tracking-tight">
          Solicitudes de pago en efectivo
        </h3>
        {pendingTotal > 0 && (
          <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-[11px] font-semibold text-yellow-400">
            {pendingTotal} pendiente{pendingTotal === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {allItems.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email, teléfono o evento…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 rounded-xl border-white/14 bg-white/[0.05] pl-9 text-sm text-white"
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/14 bg-white/[0.02] p-10 text-center text-sm text-muted-foreground">
          {q
            ? `Sin resultados para “${query.trim()}”.`
            : 'Sin solicitudes de pago en efectivo por ahora.'}
        </div>
      ) : (
        <div className="space-y-3">
          {[...pending, ...rest].map((r) => {
            const st = STATUS_LABEL[r.status] ?? STATUS_LABEL.EXPIRED;
            const isBusy = busyId === r.id;
            return (
              <div
                key={r.id}
                className="rounded-[22px] border border-white/12 bg-white/[0.025] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-display text-sm font-bold text-white">
                      {r.event.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.tier.name} × {r.quantity} ·{' '}
                      <span className="font-semibold text-white">{money(r.amountCents, r.currency)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.customer?.name || r.customer?.email}
                      {r.customer?.name ? ` · ${r.customer?.email}` : ''}
                      {r.contactPhone ? ` · ${r.contactPhone}` : ''}
                    </p>
                    {r.note && (
                      <p className="text-xs italic text-white/50">“{r.note}”</p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>
                    {st.label}
                  </span>
                </div>

                {r.status === 'PENDING' && (
                  <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3">
                    <Button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setConfirming(r)}
                      className="rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:brightness-110"
                    >
                      {isBusy && confirm.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      Confirmar cobro
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isBusy}
                      onClick={() => onCancel(r)}
                      className="rounded-full text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <X className="size-4" />
                      Cancelar
                    </Button>
                  </div>
                )}

                {r.status === 'CONFIRMED' && r.confirmedByRp && (
                  <p className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-3 text-[11px] text-emerald-400/80">
                    <Clock className="size-3" />
                    Confirmada por {r.confirmedByRp.displayName}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirming}
        onOpenChange={(o) => !o && setConfirming(null)}
        title="¿Ya te pagó?"
        description={
          confirming
            ? `Confirma que ${confirming.customer?.name || confirming.customer?.email || 'el cliente'} ya te pagó ${money(confirming.amountCents, confirming.currency)} en efectivo. Se emitirá el pase de inmediato y no se puede deshacer.`
            : undefined
        }
        confirmLabel="Sí, ya me pagó"
        cancelLabel="Cancelar"
        loading={confirm.isPending}
        onConfirm={doConfirm}
      />
    </div>
  );
}
