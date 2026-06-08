'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Clock, Loader2, MapPin, Navigation, ShieldCheck } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { Button } from '@/core/components/ui/button';
import { useGeolocation } from '@/features/geolocation';
import { LeafletMap } from '@/features/rp/components/leaflet-map';
import {
  useNearbyPickupPoints,
  type NearbyPickupPoint,
  type PickupWindow,
} from '@/features/rp/hooks/use-rp';

interface PickupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tierId: string;
  fallbackCity?: string | null;
  onConfirm: (sel: { pickupPointId?: string; pickupAt: string | null }) => void;
}

const DOW_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function distanceLabel(distanceM: number | null): string | null {
  if (distanceM == null) return null;
  if (distanceM < 1000) return `a ${Math.round(distanceM)} m`;
  return `a ${(distanceM / 1000).toFixed(1)} km`;
}

function windowDayLabel(dow: number | null): string {
  if (dow == null) return 'Cualquier día';
  return DOW_LABELS[dow] ?? 'Cualquier día';
}

/**
 * Próxima fecha (objeto Date) que cae en el `dow` del slot, con la hora de
 * inicio. Si es HOY y la hora ya pasó → siguiente semana. dow null → null.
 */
function nextDateForWindow(w: PickupWindow): Date | null {
  if (w.dow == null) return null;
  const [hh, mm] = w.start.split(':').map((n) => parseInt(n, 10));
  const now = new Date();
  const result = new Date(now);
  result.setHours(
    Number.isFinite(hh) ? hh : 0,
    Number.isFinite(mm) ? mm : 0,
    0,
    0,
  );
  // Días hasta el próximo `dow` (0-6). Si es hoy pero ya pasó la hora → +7.
  let delta = (w.dow - now.getDay() + 7) % 7;
  if (delta === 0 && result.getTime() <= now.getTime()) {
    delta = 7;
  }
  result.setDate(result.getDate() + delta);
  return result;
}

function localDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Próximos 7 días para elegir. Omite HOY si la hora de inicio del horario ya
 *  pasó (no tiene caso recoger hoy si la ventana ya terminó). */
function weekDayOptions(startHHmm: string): { value: string; label: string }[] {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [hh, mm] = startHHmm.split(':').map((n) => parseInt(n, 10));
  const todayStart = new Date(today);
  todayStart.setHours(Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0);
  const skipToday = now.getTime() > todayStart.getTime();
  const out: { value: string; label: string }[] = [];
  // Siempre 7 días seleccionables: si hoy ya no aplica, arrancamos en mañana.
  const start = skipToday ? 1 : 0;
  for (let i = start; i < start + 7; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    let label: string;
    if (i === 0) label = 'Hoy';
    else if (i === 1) label = 'Mañana';
    else {
      const wd = new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(d);
      label = `${wd.charAt(0).toUpperCase() + wd.slice(1)} ${d.getDate()}`;
    }
    out.push({ value: localDateISO(d), label });
  }
  return out;
}

function computePickupAt(w: PickupWindow): string | null {
  return nextDateForWindow(w)?.toISOString() ?? null;
}

/** Etiqueta del chip con la FECHA concreta a la que resuelve (no solo el día),
 *  para que el cliente sepa exactamente qué día va. */
function windowLabel(w: PickupWindow): string {
  if (w.dow == null) return `Cualquier día · ${w.start}–${w.end}`;
  const d = nextDateForWindow(w);
  if (!d) return `${windowDayLabel(w.dow)} · ${w.start}–${w.end}`;
  const datePart = new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(d);
  const cap = datePart.charAt(0).toUpperCase() + datePart.slice(1);
  return `${cap} · ${w.start}–${w.end}`;
}

export function PickupModal({
  open,
  onOpenChange,
  tierId,
  fallbackCity,
  onConfirm,
}: PickupModalProps) {
  const geo = useGeolocation();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedWindowIdx, setSelectedWindowIdx] = useState<number | null>(null);
  // Fecha concreta cuando el horario elegido es "cualquier día" (dow null).
  const [pickDate, setPickDate] = useState('');
  // El cliente debe leer/aceptar el aviso de seguridad antes de elegir punto.
  const [acknowledged, setAcknowledged] = useState(false);

  // Al abrir: pedimos ubicación una vez para ordenar por cercanía.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLocating(true);
    void (async () => {
      const pos = await geo.request();
      if (cancelled) return;
      if (pos) {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }
      setLocating(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset de selección al cerrar.
  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setSelectedWindowIdx(null);
      setPickDate('');
      setAcknowledged(false);
    }
  }, [open]);

  const { data, isLoading } = useNearbyPickupPoints(open ? tierId : null, coords);
  const points = useMemo(() => data?.points ?? [], [data]);

  const selectedPoint = useMemo<NearbyPickupPoint | null>(
    () => points.find((p) => p.id === selectedId) ?? null,
    [points, selectedId],
  );

  const noGps =
    !locating &&
    !coords &&
    (geo.status === 'denied' || geo.status === 'unsupported');

  const handleSelect = (id: string) => {
    setSelectedId((prev) => (prev === id ? prev : id));
    setSelectedWindowIdx(null);
    setPickDate('');
  };

  // Horario elegido (si hay) + si requiere fecha concreta ("cualquier día").
  const selectedWindow =
    selectedPoint && selectedWindowIdx != null
      ? selectedPoint.windows[selectedWindowIdx]
      : null;
  const needsDate = !!selectedWindow && selectedWindow.dow == null && !pickDate;

  const handleConfirm = () => {
    if (points.length === 0) {
      // Sin puntos definidos → el cliente igual procede; el RP coordinará.
      onConfirm({ pickupAt: null });
      onOpenChange(false);
      return;
    }
    if (!selectedPoint) return;
    const win =
      selectedWindowIdx != null
        ? selectedPoint.windows[selectedWindowIdx]
        : undefined;
    let pickupAt: string | null = null;
    if (win) {
      if (win.dow != null) {
        pickupAt = computePickupAt(win);
      } else if (pickDate) {
        // "Cualquier día" → la fecha que eligió el cliente + hora de inicio.
        const d = new Date(`${pickDate}T${win.start}:00`);
        pickupAt = Number.isNaN(d.getTime()) ? null : d.toISOString();
      }
    }
    onConfirm({ pickupPointId: selectedPoint.id, pickupAt });
    onOpenChange(false);
  };

  // Si el punto tiene horarios, hay que elegir uno antes de confirmar.
  const needsWindow =
    !!selectedPoint && selectedPoint.windows.length > 0 && selectedWindowIdx == null;
  const confirmDisabled =
    points.length > 0 && (!selectedPoint || needsWindow || needsDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[88vh] flex-col gap-0 overflow-hidden rounded-[22px] border-white/14 bg-[#0c0c12]/95 p-0 sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-white/8 px-5 pb-4 pt-5 text-left">
          <DialogTitle className="font-display text-lg font-semibold">
            ¿Dónde quieres recoger?
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Para mostrarte el punto más cercano usamos tu ubicación.
            {fallbackCity ? ` Zona: ${fallbackCity}.` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!acknowledged ? (
            <SafetyNotice onAccept={() => setAcknowledged(true)} />
          ) : (
            <>
          {locating && (
            <p className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              Obteniendo tu ubicación…
            </p>
          )}

          {noGps && (
            <p className="mb-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              Activa tu ubicación para ordenar los puntos por cercanía.
            </p>
          )}

          {!locating && isLoading && (
            <p className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              Buscando puntos de cobro…
            </p>
          )}

          {!locating && !isLoading && points.length === 0 && (
            <div className="space-y-1 py-6 text-center">
              <div className="mx-auto grid size-11 place-items-center rounded-full bg-white/[0.05] text-muted-foreground">
                <MapPin className="size-5" />
              </div>
              <p className="text-sm text-neutral-300">
                Este vendedor aún no define puntos.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Te contactará para coordinar dónde recoger.
              </p>
            </div>
          )}

          {!locating && !isLoading && points.length > 0 && (
            <ul className="space-y-3">
              {points.map((point) => {
                const isSelected = point.id === selectedId;
                const dist = distanceLabel(point.distanceM);
                return (
                  <li key={point.id}>
                    {/* div clickeable (no <button>): el card contiene botones
                        anidados — mapa, chips de horario, link — y button-en-button
                        es HTML inválido. */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelect(point.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelect(point.id);
                        }
                      }}
                      className={`w-full cursor-pointer rounded-[18px] border p-3 text-left transition ${
                        isSelected
                          ? 'border-primary/50 bg-primary/10'
                          : 'border-white/10 bg-white/[0.025] hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-display text-sm font-semibold text-white">
                            <MapPin className="size-3.5 shrink-0 text-primary" />
                            <span className="truncate">{point.label}</span>
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {point.isVenueDoor && (
                              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                Puerta del evento
                              </span>
                            )}
                            {dist && (
                              <span className="text-[11px] text-muted-foreground">
                                {dist}
                              </span>
                            )}
                          </div>
                          {point.reference && (
                            <p className="mt-1 text-[11px] leading-snug text-white/70">
                              📍 {point.reference}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-muted-foreground/80">
                            Vendedor: {point.rpDisplayName}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">
                            <Check className="size-3.5" />
                          </span>
                        )}
                      </div>

                      <div className="mt-3 overflow-hidden rounded-2xl">
                        <LeafletMap
                          mode="view"
                          value={{ lat: point.latitude, lng: point.longitude }}
                          height={140}
                        />
                      </div>

                      {point.mapsUrl && (
                        <a
                          href={point.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary transition-colors hover:text-primary/80"
                        >
                          <Navigation className="size-3.5" />
                          Cómo llegar
                        </a>
                      )}

                      {isSelected && point.windows.length > 0 && (
                        <div
                          className={`mt-3 rounded-2xl border p-3 transition ${
                            selectedWindowIdx == null
                              ? 'border-primary/40 bg-primary/[0.07]'
                              : 'border-white/10 bg-white/[0.02]'
                          }`}
                        >
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-white">
                            <Clock className="size-3.5 text-primary" />
                            {selectedWindowIdx == null
                              ? '2. Ahora elige a qué hora pasas'
                              : 'Horario elegido'}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {selectedWindowIdx == null
                              ? 'Toca uno de los horarios para continuar.'
                              : 'Puedes cambiarlo tocando otro.'}
                          </p>
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {point.windows.map((w, idx) => {
                              const active = selectedWindowIdx === idx;
                              return (
                                <button
                                  key={`${w.dow}-${w.start}-${w.end}-${idx}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedWindowIdx((prev) =>
                                      prev === idx ? null : idx,
                                    );
                                    setPickDate('');
                                  }}
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                    active
                                      ? 'border-primary bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white shadow-[0_4px_14px_-4px_rgba(168,85,247,0.6)]'
                                      : 'border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]'
                                  }`}
                                >
                                  {active && <Check className="size-3.5" />}
                                  {windowLabel(w)}
                                </button>
                              );
                            })}
                          </div>

                          {/* "Cualquier día" → el cliente elige el día (solo los
                              que quedan de esta semana). */}
                          {selectedWindow && selectedWindow.dow == null && (
                            <div className="mt-3 border-t border-white/10 pt-3">
                              <p className="text-[11px] font-semibold text-white">
                                ¿Qué día vas a pasar?
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {weekDayOptions(selectedWindow.start).map((opt) => {
                                  const on = pickDate === opt.value;
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPickDate(opt.value);
                                      }}
                                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                        on
                                          ? 'border-primary bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white shadow-[0_4px_14px_-4px_rgba(168,85,247,0.6)]'
                                          : 'border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
            </>
          )}
        </div>

        {acknowledged && (
          <div className="shrink-0 border-t border-white/8 px-5 py-4">
            <Button
              type="button"
              disabled={confirmDisabled}
              onClick={handleConfirm}
              className="h-11 w-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 font-semibold text-white shadow-[0_4px_18px_-4px_rgba(124,58,237,0.5)] transition-transform hover:brightness-110 active:scale-95 transform-gpu disabled:opacity-50 disabled:active:scale-100"
            >
              {points.length === 0
                ? 'Continuar de todas formas'
                : !selectedPoint
                  ? 'Elige un punto'
                  : needsWindow
                    ? 'Elige un horario'
                    : needsDate
                      ? 'Elige el día'
                      : 'Confirmar punto'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Aviso de seguridad que el cliente debe leer/aceptar antes de elegir punto. */
function SafetyNotice({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-primary/12 text-primary">
        <ShieldCheck className="size-6" />
      </span>
      <p className="mt-3 font-display text-base font-bold text-white">
        Antes de elegir, cuídate
      </p>
      <ul className="mt-3 space-y-2.5 text-left text-sm leading-snug text-white/70">
        <li className="flex gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Elige un punto{' '}
            <span className="font-semibold text-white">público y concurrido</span>: una plaza,
            centro comercial o zona transitada.
          </span>
        </li>
        <li className="flex gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>Evita lugares solos o privados. Llega a la luz del día si puedes.</span>
        </li>
        <li className="flex gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>Cuida bien dónde te encuentras con el vendedor para pagar en efectivo.</span>
        </li>
      </ul>
      <Button
        type="button"
        onClick={onAccept}
        className="mt-5 w-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 font-semibold text-white"
      >
        Entendido y acepto
      </Button>
    </div>
  );
}
