'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Banknote, Check } from 'lucide-react';
import { toast } from 'sonner';
import { clientFetch } from '@/core/lib/api/client-client';
import { Button } from '@/core/components/ui/button';

interface CashRp {
  rpProfileId: string;
  displayName: string;
  rpCode: string;
  isActive: boolean;
  email: string;
}

interface CashRpsResponse {
  allowCashPayment: boolean;
  items: CashRp[];
}

interface RpListItem {
  id: string;
  displayName: string;
  rpCode: string;
  isActive: boolean;
  user: { email: string };
}

/**
 * Configura el PAGO EN EFECTIVO de un evento (acción ADMIN): activa/desactiva
 * la opción y elige qué RPs reciben las solicitudes de los clientes y pueden
 * confirmar el cobro. Boleto digital, pago físico vía RP.
 */
export function CashPaymentSection({ eventId }: { eventId: string }) {
  const qc = useQueryClient();

  const cashRps = useQuery({
    queryKey: ['event-cash-rps', eventId],
    queryFn: () => clientFetch<CashRpsResponse>(`/api/events/${eventId}/cash-rps`),
  });

  const allRps = useQuery({
    queryKey: ['rps', 'picker'],
    queryFn: () =>
      clientFetch<{ items: RpListItem[] }>(`/api/rp?limit=100`),
  });

  const [allow, setAllow] = React.useState<boolean>(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  // Sincroniza el estado local cuando llegan los datos.
  React.useEffect(() => {
    if (cashRps.data) {
      setAllow(cashRps.data.allowCashPayment);
      setSelected(new Set(cashRps.data.items.map((r) => r.rpProfileId)));
    }
  }, [cashRps.data]);

  const saveToggle = useMutation({
    mutationFn: (next: boolean) =>
      clientFetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        body: { allowCashPayment: next },
      }),
    onSuccess: (_d, next) => {
      setAllow(next);
      qc.invalidateQueries({ queryKey: ['event-cash-rps', eventId] });
      qc.invalidateQueries({ queryKey: ['events'] });
      toast.success(next ? 'Pago en efectivo activado' : 'Pago en efectivo desactivado');
    },
    onError: () => toast.error('No se pudo actualizar'),
  });

  const saveRps = useMutation({
    mutationFn: (ids: string[]) =>
      clientFetch<CashRpsResponse>(`/api/events/${eventId}/cash-rps`, {
        method: 'PUT',
        body: { rpProfileIds: ids },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-cash-rps', eventId] });
      toast.success('Vendedores actualizados');
    },
    onError: () => toast.error('No se pudieron guardar los vendedores'),
  });

  const toggleRp = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (cashRps.isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Cargando…
      </div>
    );
  }

  const rps = allRps.data?.items ?? [];

  return (
    <div className="space-y-5">
      {/* Toggle activar/desactivar */}
      <div className="flex items-center justify-between rounded-2xl border border-white/14 bg-white/[0.035] p-4">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <Banknote className="size-4 text-primary" />
            Permitir pago en efectivo
          </p>
          <p className="text-xs text-muted-foreground">
            El cliente solicita desde la app y un RP asignado cobra en persona.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={allow}
          disabled={saveToggle.isPending}
          onClick={() => saveToggle.mutate(!allow)}
          className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${
            allow ? 'justify-end bg-primary' : 'justify-start bg-white/15'
          }`}
        >
          <span className="size-5 rounded-full bg-white shadow-sm" />
        </button>
      </div>

      {/* Selector de RPs (solo relevante si está activo) */}
      {allow && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Vendedores asignados (RP)
          </p>
          {rps.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/14 p-4 text-center text-xs text-muted-foreground">
              No hay RPs registrados. Crea uno en Admin · RPs.
            </p>
          ) : (
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {rps.map((rp) => {
                const checked = selected.has(rp.id);
                return (
                  <button
                    key={rp.id}
                    type="button"
                    onClick={() => toggleRp(rp.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                      checked
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-white/14 bg-white/[0.035] hover:bg-white/[0.07]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {rp.displayName}{' '}
                        <span className="font-mono text-[11px] text-primary/70">{rp.rpCode}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{rp.user.email}</p>
                    </div>
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-md border ${
                        checked ? 'border-primary bg-primary text-white' : 'border-white/22'
                      }`}
                    >
                      {checked && <Check className="size-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <Button
            type="button"
            disabled={saveRps.isPending}
            onClick={() => saveRps.mutate(Array.from(selected))}
            className="rounded-full"
          >
            {saveRps.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Guardar vendedores
          </Button>
        </div>
      )}
    </div>
  );
}
