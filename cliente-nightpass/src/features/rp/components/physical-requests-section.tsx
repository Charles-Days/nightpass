'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Loader2, Banknote, Calendar, Check, ChevronDown, X, Clock, Search } from 'lucide-react';
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

const NO_POINT_LABEL = 'Sin punto · a coordinar';

/** Key del día más próximo: hoy si tiene citas, si no el siguiente. Si todos son
 *  pasados, el primero de la lista. (days vienen ordenados ascendente). */
function nearestDayKey(days: { key: string; sortKey: number }[]): string | null {
  if (days.length === 0) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = days.find((d) => d.sortKey >= today.getTime());
  return (upcoming ?? days[0]).key;
}

/** "Lunes 8 jun" — encabezado del subgrupo por día dentro de un lugar. */
function dayHeading(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const s = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "8:00 p.m." — hora sola (el día ya va en el encabezado del subgrupo). */
function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-MX', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

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
  CONFIRMED: {
    label: 'Confirmada',
    cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
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
  // Filtro por evento: con varios eventos asignados la lista se satura, así que
  // el RP elige uno a la vez ('all' = todos).
  const [eventFilter, setEventFilter] = React.useState<string>('all');

  const allItems = React.useMemo(() => data?.items ?? [], [data]);

  // Eventos presentes en las solicitudes (para los chips de filtro).
  const eventChips = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const r of allItems) m.set(r.event.id, r.event.title);
    return Array.from(m, ([id, title]) => ({ id, title }));
  }, [allItems]);

  const q = query.trim().toLowerCase();
  const items = allItems.filter((r) => {
    if (eventFilter !== 'all' && r.event.id !== eventFilter) return false;
    if (!q) return true;
    const haystack = [r.customer?.name, r.customer?.email, r.contactPhone, r.event.title]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
  const pendingTotal = allItems.filter((r) => r.status === 'PENDING').length;

  // Agrupa por LUGAR y, dentro de cada lugar, por DÍA de la cita (cronológico;
  // lo "sin fecha" al final). PENDING primero en cada día.
  const groups = React.useMemo(() => {
    type Day = {
      key: string;
      label: string;
      sortKey: number;
      items: PhysicalPaymentRequest[];
    };
    const placeMap = new Map<string, { label: string; days: Map<string, Day> }>();
    for (const r of items) {
      const pKey = r.pickupPoint?.id ?? '__none__';
      const pLabel = r.pickupPoint?.label ?? NO_POINT_LABEL;
      if (!placeMap.has(pKey)) placeMap.set(pKey, { label: pLabel, days: new Map() });
      const place = placeMap.get(pKey)!;

      let dKey: string, dLabel: string, sortKey: number;
      if (r.pickupAt) {
        const d = new Date(r.pickupAt);
        dKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        dLabel = dayHeading(r.pickupAt);
        sortKey = d.getTime();
      } else {
        dKey = '__nofecha__';
        dLabel = 'Sin fecha · a coordinar';
        sortKey = Number.MAX_SAFE_INTEGER;
      }
      if (!place.days.has(dKey)) {
        place.days.set(dKey, { key: dKey, label: dLabel, sortKey, items: [] });
      }
      place.days.get(dKey)!.items.push(r);
    }

    return Array.from(placeMap.entries())
      .sort(([a], [b]) => (a === '__none__' ? 1 : b === '__none__' ? -1 : 0))
      .map(([pKey, place]) => ({
        key: pKey,
        label: place.label,
        count: Array.from(place.days.values()).reduce((n, d) => n + d.items.length, 0),
        days: Array.from(place.days.values())
          .sort((a, b) => a.sortKey - b.sortKey)
          .map((d) => ({
            key: d.key,
            label: d.label,
            sortKey: d.sortKey,
            items: [
              ...d.items.filter((r) => r.status === 'PENDING'),
              ...d.items.filter((r) => r.status !== 'PENDING'),
            ],
          })),
      }));
  }, [items]);

  // Acordeón por lugar: default TODOS cerrados (lista corta de lugares; abres el
  // que vas a trabajar).
  const [openPlaces, setOpenPlaces] = React.useState<Record<string, boolean>>({});
  const isPlaceOpen = (key: string) => openPlaces[key] === true;
  const togglePlace = (key: string) => setOpenPlaces((o) => ({ ...o, [key]: !o[key] }));

  // Por defecto, dentro de un lugar solo se muestra el día más próximo; el resto
  // queda tras "ver otros días" para no saturar al RP.
  const [allDays, setAllDays] = React.useState<Record<string, boolean>>({});
  const toggleAllDays = (key: string) => setAllDays((o) => ({ ...o, [key]: !o[key] }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Banknote className="text-primary size-4 shrink-0" />
          <h3 className="font-display truncate text-base font-bold tracking-tight sm:text-lg">
            Solicitudes en efectivo
          </h3>
        </div>
        {pendingTotal > 0 && (
          <span className="shrink-0 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-1 text-[11px] font-semibold text-yellow-400">
            {pendingTotal} pendiente{pendingTotal === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {allItems.length > 0 && (
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar por nombre, email, teléfono o evento…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 rounded-xl border-white/14 bg-white/[0.05] pl-9 text-sm text-white"
          />
        </div>
      )}

      {/* Filtro por evento (solo si hay más de uno) para no saturar la lista. */}
      {eventChips.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[{ id: 'all', title: 'Todos' }, ...eventChips].map((ev) => {
            const active = eventFilter === ev.id;
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => setEventFilter(ev.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'border-primary bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white'
                    : 'border-white/12 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
                }`}
              >
                {ev.title}
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
          <Loader2 className="size-4 animate-spin" /> Cargando…
        </div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground rounded-2xl border border-dashed border-white/14 bg-white/[0.02] p-10 text-center text-sm">
          {q
            ? `Sin resultados para “${query.trim()}”.`
            : 'Sin solicitudes de pago en efectivo por ahora.'}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const open = isPlaceOpen(group.key);
            return (
              <div key={group.key} className="space-y-3">
                <button
                  type="button"
                  onClick={() => togglePlace(group.key)}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-white/14 bg-white/[0.04] text-[11px] font-semibold text-white/70">
                    {group.count}
                  </span>
                  <span className="text-primary min-w-0 flex-1 truncate text-[11px] font-semibold tracking-[0.18em] uppercase">
                    {group.label}
                  </span>
                  <ChevronDown
                    className={`text-primary size-4 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
                  />
                </button>

                {open &&
                  (allDays[group.key]
                    ? group.days
                    : group.days.filter((d) => d.key === nearestDayKey(group.days))
                  ).map((day) => (
                    <div key={day.key} className="space-y-2">
                      <p className="flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-white/65">
                        <Calendar className="text-primary/70 size-3" />
                        {day.label}
                        <span className="text-white/40">· {day.items.length}</span>
                      </p>

                      {day.items.map((r) => {
                        const st = STATUS_LABEL[r.status] ?? STATUS_LABEL.EXPIRED;
                        const isBusy = busyId === r.id;
                        return (
                          <div
                            key={r.id}
                            className="rounded-[22px] border border-white/12 bg-white/[0.025] p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 space-y-1.5">
                                <p className="text-xs leading-snug">
                                  <span className="text-white/40">Evento: </span>
                                  <span className="font-semibold text-white">
                                    {r.event.title}
                                  </span>
                                </p>
                                <p className="text-xs leading-snug">
                                  <span className="text-white/40">Boletos: </span>
                                  <span className="text-white/80">
                                    {r.tier.name} × {r.quantity}
                                  </span>{' '}
                                  ·{' '}
                                  <span className="font-semibold text-white">
                                    {money(r.amountCents, r.currency)}
                                  </span>
                                </p>
                                <p className="text-xs leading-snug">
                                  <span className="text-white/40">Cliente: </span>
                                  <span className="text-white/80">
                                    {r.customer?.name || r.customer?.email}
                                    {r.customer?.name ? ` · ${r.customer?.email}` : ''}
                                    {r.contactPhone ? ` · ${r.contactPhone}` : ''}
                                  </span>
                                </p>
                                {r.pickupAt && (
                                  <p className="flex items-center gap-1.5 text-xs leading-snug">
                                    <Clock className="text-primary size-3 shrink-0" />
                                    <span className="text-white/40">Encuentro: </span>
                                    <span className="font-semibold text-white/80">
                                      {timeLabel(r.pickupAt)}
                                    </span>
                                  </p>
                                )}
                              </div>
                              <span
                                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}
                              >
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
                  ))}

                {open && group.days.length > 1 && (
                  <button
                    type="button"
                    onClick={() => toggleAllDays(group.key)}
                    className="text-primary hover:text-primary/80 ml-5 text-[11px] font-semibold transition"
                  >
                    {allDays[group.key] ? 'Ver menos' : `Ver otros días (${group.days.length - 1})`}
                  </button>
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
