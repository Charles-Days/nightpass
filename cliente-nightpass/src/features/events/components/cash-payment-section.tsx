'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Banknote, Check, CreditCard } from 'lucide-react';
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
  allowOnlinePayment: boolean;
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
 * Configura los MÉTODOS DE PAGO de un evento (admin, organizador o venue):
 * activa/desactiva pago en línea (Stripe) y pago en efectivo, y elige qué RPs
 * reciben las solicitudes de efectivo y pueden confirmar el cobro. Al menos un
 * método debe quedar activo — el modo resultante es solo línea / solo efectivo
 * / ambos.
 */
interface CashPaymentSectionProps {
  eventId: string;
  /**
   * Endpoint que lista los RPs asignables en el selector de vendedores.
   * - Admin: `/api/rp` (todos) — default.
   * - Organizador: `/api/rp/promoter/mine` (solo los suyos).
   * - Venue: `null` → oculta el selector (los RPs de efectivo los asigna el
   *   equipo NightPass; el venue solo decide los métodos de pago).
   */
  rpListPath?: string | null;
}

export function CashPaymentSection({
  eventId,
  rpListPath = '/api/rp',
}: CashPaymentSectionProps) {
  const qc = useQueryClient();

  const cashRps = useQuery({
    queryKey: ['event-cash-rps', eventId],
    queryFn: () => clientFetch<CashRpsResponse>(`/api/events/${eventId}/cash-rps`),
  });

  const allRps = useQuery({
    queryKey: ['rps', 'picker', rpListPath],
    enabled: rpListPath != null,
    queryFn: () =>
      clientFetch<{ items: RpListItem[] }>(
        `${rpListPath}${rpListPath!.includes('?') ? '&' : '?'}limit=100`,
      ),
  });

  const [allow, setAllow] = React.useState<boolean>(false);
  const [allowOnline, setAllowOnline] = React.useState<boolean>(true);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  // Sincroniza el estado local cuando llegan los datos.
  React.useEffect(() => {
    if (cashRps.data) {
      setAllow(cashRps.data.allowCashPayment);
      setAllowOnline(cashRps.data.allowOnlinePayment);
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

  const saveOnlineToggle = useMutation({
    mutationFn: (next: boolean) =>
      clientFetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        body: { allowOnlinePayment: next },
      }),
    onSuccess: (_d, next) => {
      setAllowOnline(next);
      qc.invalidateQueries({ queryKey: ['event-cash-rps', eventId] });
      qc.invalidateQueries({ queryKey: ['events'] });
      toast.success(next ? 'Pago en línea activado' : 'Pago en línea desactivado');
    },
    onError: () => toast.error('No se pudo actualizar'),
  });

  // No permitir apagar ambos métodos (el backend también lo valida).
  const toggleCash = (next: boolean) => {
    if (!next && !allowOnline) {
      toast.error('Debe quedar activo al menos un método de pago');
      return;
    }
    saveToggle.mutate(next);
  };
  const toggleOnline = (next: boolean) => {
    if (!next && !allow) {
      toast.error('Debe quedar activo al menos un método de pago');
      return;
    }
    saveOnlineToggle.mutate(next);
  };

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
      {/* Toggle pago en línea (Stripe) */}
      <div className="flex items-center justify-between rounded-2xl border border-white/14 bg-white/[0.035] p-4">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <CreditCard className="size-4 text-primary" />
            Permitir pago en línea
          </p>
          <p className="text-xs text-muted-foreground">
            El cliente paga con tarjeta (Stripe) al instante desde la app.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={allowOnline}
          disabled={saveOnlineToggle.isPending}
          onClick={() => toggleOnline(!allowOnline)}
          className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${
            allowOnline ? 'justify-end bg-primary' : 'justify-start bg-white/15'
          }`}
        >
          <span className="size-5 rounded-full bg-white shadow-sm" />
        </button>
      </div>

      {/* Toggle activar/desactivar efectivo */}
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
          onClick={() => toggleCash(!allow)}
          className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${
            allow ? 'justify-end bg-primary' : 'justify-start bg-white/15'
          }`}
        >
          <span className="size-5 rounded-full bg-white shadow-sm" />
        </button>
      </div>

      {/* Aviso de modo solo-efectivo */}
      {!allowOnline && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          Modo solo efectivo: el pago con tarjeta está desactivado para este
          evento.
        </p>
      )}

      {/* Venue: no gestiona RPs — los asigna el equipo NightPass. */}
      {allow && rpListPath == null && (
        <p className="rounded-xl border border-dashed border-white/14 p-4 text-center text-xs text-muted-foreground">
          Los vendedores (RP) que cobran en efectivo los asigna el equipo
          NightPass para este evento.
        </p>
      )}

      {/* Selector de RPs (solo relevante si está activo) */}
      {allow && rpListPath != null && (
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
