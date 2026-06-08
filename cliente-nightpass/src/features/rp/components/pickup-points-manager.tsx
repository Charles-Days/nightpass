'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import { ConfirmDialog } from '@/core/components/ui/confirm-dialog';
import { ClientApiError } from '@/core/lib/api/client-client';
import { LeafletMap } from '@/features/rp/components/leaflet-map';
import {
  useRpPickupPoints,
  useCreatePickupPoint,
  useUpdatePickupPoint,
  useDeletePickupPoint,
  useResolveMapsLink,
  type PickupPoint,
  type PickupWindow,
  type PickupPointInput,
} from '../hooks/use-rp';

// dow 0-6 → Dom..Sáb. null = cualquier día.
const DOW_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function dowLabel(dow: number | null): string {
  if (dow === null) return 'Cualquier día';
  return DOW_LABELS[dow] ?? 'Cualquier día';
}

function windowSummary(w: PickupWindow): string {
  return `${dowLabel(w.dow)} ${w.start}–${w.end}`;
}

/** Saca el mensaje del backend (p.ej. "no se pudo derivar las coordenadas"). */
function errMessage(e: unknown): string {
  if (e instanceof ClientApiError && e.payload && typeof e.payload === 'object') {
    const msg = (e.payload as { message?: unknown }).message;
    if (typeof msg === 'string' && msg) return msg;
    if (Array.isArray(msg) && msg.length) return String(msg[0]);
  }
  return 'No se pudo guardar el punto';
}

export function PickupPointsManager({
  basePath = '/api/rp',
}: {
  /** '/api/rp' (RP propio), '/api/rp/<id>' (admin), '/api/rp/promoter/mine/<id>' (organizador). */
  basePath?: string;
}) {
  const { data, isLoading } = useRpPickupPoints(basePath);
  const [editing, setEditing] = React.useState<PickupPoint | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<PickupPoint | null>(null);

  const del = useDeletePickupPoint(basePath);

  const points = data ?? [];

  const doDelete = () => {
    if (!deleting) return;
    del.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Punto eliminado');
        setDeleting(null);
      },
      onError: (e) => toast.error(errMessage(e)),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <MapPin className="text-primary size-4" />
        <div>
          <h3 className="font-display text-lg font-bold tracking-tight">Puntos de cobro</h3>
          <p className="text-muted-foreground text-xs">
            Define dónde cobras efectivo; el cliente elige el más cercano.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
          <Loader2 className="size-4 animate-spin" /> Cargando…
        </div>
      ) : points.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/14 bg-white/[0.02] p-8 text-center">
          <span className="bg-primary/12 text-primary mx-auto grid size-12 place-items-center rounded-2xl">
            <MapPin className="size-6" />
          </span>
          <p className="font-display mt-4 text-base font-bold text-white">
            Aún no tienes puntos de cobro
          </p>
          <p className="text-muted-foreground mx-auto mt-1.5 max-w-xs text-sm">
            Agrega el primero para que tus clientes sepan dónde y a qué hora pagarte en efectivo.
          </p>
          <Button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-5 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)]"
          >
            <Plus className="mr-1.5 size-4" />
            Agregar punto
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="border-primary/30 bg-primary/[0.04] text-primary hover:border-primary/50 hover:bg-primary/[0.08] flex min-h-[64px] items-center justify-center gap-2 rounded-[18px] border border-dashed p-4 text-sm font-semibold transition active:scale-[0.99]"
          >
            <Plus className="size-4" />
            Agregar punto
          </button>
          {points.map((p) => (
            <div key={p.id} className="rounded-[18px] border border-white/12 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="font-display truncate text-sm font-bold text-white">{p.label}</p>
                  {p.reference && (
                    <p className="text-[11px] leading-snug text-white/55">{p.reference}</p>
                  )}
                  {p.isVenueDoor && (
                    <span className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                      <MapPin className="size-3" /> Puerta del evento
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="grid size-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                    aria-label="Editar punto"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(p)}
                    className="grid size-8 place-items-center rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                    aria-label="Eliminar punto"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                <LeafletMap
                  mode="view"
                  value={{ lat: p.latitude, lng: p.longitude }}
                  height={140}
                />
              </div>

              <div className="mt-3 space-y-1">
                {p.windows.length === 0 ? (
                  <p className="text-xs text-white/45">Sin horarios definidos.</p>
                ) : (
                  p.windows.map((w, i) => (
                    <p key={i} className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <Clock className="text-primary/70 size-3" />
                      {windowSummary(w)}
                    </p>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <PickupPointDialog
          point={editing}
          basePath={basePath}
          open={creating || !!editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="¿Eliminar este punto?"
        description={
          deleting
            ? `«${deleting.label}» dejará de aparecer para tus clientes. Esta acción no se puede deshacer.`
            : undefined
        }
        variant="destructive"
        confirmLabel="Sí, eliminar"
        loading={del.isPending}
        onConfirm={doDelete}
      />
    </div>
  );
}

// ── Dialog crear / editar ──────────────────────────────────────────────────

interface DialogProps {
  point: PickupPoint | null; // null = crear
  basePath: string;
  open: boolean;
  onClose: () => void;
}

function PickupPointDialog({ point, basePath, open, onClose }: DialogProps) {
  const isEdit = !!point;
  const create = useCreatePickupPoint(basePath);
  const update = useUpdatePickupPoint(basePath);
  const resolveLink = useResolveMapsLink();
  const pending = create.isPending || update.isPending;

  const [label, setLabel] = React.useState(point?.label ?? '');
  const [reference, setReference] = React.useState(point?.reference ?? '');
  const [mapsUrl, setMapsUrl] = React.useState(point?.mapsUrl ?? '');
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(
    point ? { lat: point.latitude, lng: point.longitude } : null,
  );
  // Se conserva el valor del punto en edición; ya no hay toggle en la UI.
  const [isVenueDoor] = React.useState(point?.isVenueDoor ?? false);
  const [windows, setWindows] = React.useState<PickupWindow[]>(point?.windows ?? []);
  // Wizard: 1 = ubicación, 2 = horarios. Parte el form para no saturar al RP.
  const [step, setStep] = React.useState<1 | 2>(1);

  const addWindow = () => setWindows((ws) => [...ws, { dow: null, start: '20:00', end: '21:00' }]);

  const removeWindow = (idx: number) => setWindows((ws) => ws.filter((_, i) => i !== idx));

  const patchWindow = (idx: number, patch: Partial<PickupWindow>) =>
    setWindows((ws) => ws.map((w, i) => (i === idx ? { ...w, ...patch } : w)));

  const applyTemplateWeekend = () =>
    setWindows((ws) => [
      ...ws,
      { dow: 5, start: '20:00', end: '21:00' }, // Vie
      { dow: 6, start: '20:00', end: '21:00' }, // Sáb
      { dow: 0, start: '20:00', end: '21:00' }, // Dom
    ]);

  const applyTemplateNoon = () =>
    setWindows((ws) => [...ws, { dow: null, start: '12:00', end: '13:00' }]);

  // Pega el link → el backend lo resuelve a coords → movemos el pin/mapa. Da
  // feedback inmediato de que el link sirve (los short links no se pueden leer
  // en el cliente por CORS, por eso lo resuelve el server).
  const locateFromLink = () => {
    const url = mapsUrl.trim();
    if (!url || resolveLink.isPending) return;
    resolveLink.mutate(url, {
      onSuccess: ({ lat, lng }) => {
        setCoords({ lat, lng });
        toast.success('Ubicación encontrada');
      },
      onError: (e) => toast.error(errMessage(e)),
    });
  };

  // Valida el paso 1 (ubicación) antes de avanzar a horarios.
  const goNext = () => {
    if (!label.trim()) {
      toast.error('Ponle un nombre al punto');
      return;
    }
    if (!coords && !mapsUrl.trim()) {
      toast.error('Coloca un pin en el mapa o pega el link de Google Maps');
      return;
    }
    setStep(2);
  };

  // Guarda (paso 2). Sin form/submit: se llama solo desde el botón "Crear punto"
  // con onClick → ningún elemento puede auto-enviar el form (evita el bug de que
  // "Siguiente" guarde al reusar React el mismo <button>).
  const handleSave = () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      toast.error('Ponle un nombre al punto');
      setStep(1);
      return;
    }
    const trimmedUrl = mapsUrl.trim();
    if (!coords && !trimmedUrl) {
      toast.error('Coloca un pin en el mapa o pega el link de Google Maps');
      setStep(1);
      return;
    }

    // Si dejó un pin → mandamos coords; si no, mandamos mapsUrl (el backend
    // deriva las coordenadas). El pin manda sobre el link.
    const base: PickupPointInput = {
      label: trimmedLabel,
      reference: reference.trim() || undefined,
      windows,
      isVenueDoor,
    };
    const body: PickupPointInput = coords
      ? { ...base, latitude: coords.lat, longitude: coords.lng }
      : { ...base, mapsUrl: trimmedUrl };

    if (isEdit && point) {
      update.mutate(
        { id: point.id, data: body },
        {
          onSuccess: () => {
            toast.success('Punto actualizado');
            onClose();
          },
          onError: (err) => toast.error(errMessage(err)),
        },
      );
    } else {
      create.mutate(body, {
        onSuccess: () => {
          toast.success('Punto creado');
          onClose();
        },
        onError: (err) => toast.error(errMessage(err)),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar punto' : 'Nuevo punto de cobro'}</DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Paso 1: ¿dónde cobras? Ponle nombre y marca el lugar.'
              : 'Paso 2: ¿en qué horarios? Así el cliente sabe cuándo verte.'}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {[
            { n: 1 as const, l: 'Ubicación' },
            { n: 2 as const, l: 'Horarios' },
          ].map((s, i) => (
            <React.Fragment key={s.n}>
              <div className="flex items-center gap-2">
                <span
                  className={`grid size-6 place-items-center rounded-full border text-[11px] font-bold ${
                    step >= s.n
                      ? 'border-primary/40 bg-primary/15 text-primary'
                      : 'border-white/15 text-white/40'
                  }`}
                >
                  {step > s.n ? <Check className="size-3" /> : s.n}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    step === s.n ? 'text-white' : 'text-white/45'
                  }`}
                >
                  {s.l}
                </span>
              </div>
              {i === 0 && <span className="h-px flex-1 bg-white/10" />}
            </React.Fragment>
          ))}
        </div>

        <div className="space-y-5">
          {step === 1 && (
            <div className="space-y-5">
              <Field label="Nombre del punto" htmlFor="pp-label">
                <Input
                  id="pp-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ej. Esquina del Oxxo · Av. Juárez"
                  className="rounded-xl border-white/14 bg-white/[0.05] text-white"
                />
              </Field>

              <Field
                label="¿Dónde exactamente? (referencia)"
                htmlFor="pp-ref"
                description="El pin es aproximado. Dile al cliente cómo ubicarte."
              >
                <Input
                  id="pp-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ej. Enfrente de la plaza, junto al Oxxo azul"
                  className="rounded-xl border-white/14 bg-white/[0.05] text-white"
                />
              </Field>

              <Field
                label="Pega el link de Google Maps"
                htmlFor="pp-maps"
                description="Pégalo y toca «Ubicar»: el sistema saca las coordenadas y mueve el pin. También puedes colocar el pin a mano abajo."
              >
                <div className="flex gap-2">
                  <Input
                    id="pp-maps"
                    value={mapsUrl}
                    onChange={(e) => setMapsUrl(e.target.value)}
                    onBlur={locateFromLink}
                    placeholder="https://maps.app.goo.gl/…"
                    className="flex-1 rounded-xl border-white/14 bg-white/[0.05] text-white"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={locateFromLink}
                    disabled={!mapsUrl.trim() || resolveLink.isPending}
                    className="shrink-0 rounded-xl"
                  >
                    {resolveLink.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Ubicar'}
                  </Button>
                </div>
              </Field>

              <div className="space-y-1.5">
                <p className="text-sm font-medium text-white/85">O coloca el pin</p>
                <p className="text-muted-foreground text-xs">
                  Toca el mapa para marcar el lugar, o arrastra el pin para afinarlo. El pin tiene
                  prioridad sobre el link.
                </p>
                <div className="overflow-hidden rounded-xl border border-white/12">
                  <LeafletMap mode="pick" value={coords} onChange={setCoords} height={240} />
                </div>
                {coords && (
                  <p className="text-[11px] text-emerald-300/80">
                    Pin en {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {/* Editor de horarios */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-white/85">Horarios</p>
                  <p className="text-muted-foreground text-xs">
                    ¿Qué días y a qué hora cobras? Usa una plantilla o agrégalos a mano.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={applyTemplateWeekend}
                      className="rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/75 transition hover:bg-white/[0.1]"
                    >
                      Fin de semana 8–9pm
                    </button>
                    <button
                      type="button"
                      onClick={applyTemplateNoon}
                      className="rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/75 transition hover:bg-white/[0.1]"
                    >
                      Mediodía 12–1pm
                    </button>
                  </div>
                </div>

                {windows.length === 0 ? (
                  <p className="text-xs text-white/45">
                    Sin horarios. Agrega al menos uno para guiar al cliente (o usa una plantilla).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {windows.map((w, i) => (
                      <div
                        key={i}
                        className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={w.dow === null ? 'any' : String(w.dow)}
                            onChange={(e) =>
                              patchWindow(i, {
                                dow: e.target.value === 'any' ? null : Number(e.target.value),
                              })
                            }
                            className="h-9 rounded-lg border border-white/14 bg-[#15121f] px-2 text-sm text-white"
                          >
                            <option value="any">Cualquier día</option>
                            {DOW_LABELS.map((d, idx) => (
                              <option key={idx} value={idx}>
                                {d}
                              </option>
                            ))}
                          </select>
                          <input
                            type="time"
                            value={w.start}
                            onChange={(e) => patchWindow(i, { start: e.target.value })}
                            className="h-9 rounded-lg border border-white/14 bg-white/[0.05] px-2 text-sm text-white"
                          />
                          <span className="text-xs text-white/40">a</span>
                          <input
                            type="time"
                            value={w.end}
                            onChange={(e) => patchWindow(i, { end: e.target.value })}
                            className="h-9 rounded-lg border border-white/14 bg-white/[0.05] px-2 text-sm text-white"
                          />
                          <button
                            type="button"
                            onClick={() => removeWindow(i)}
                            className="ml-auto grid size-8 place-items-center rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 transition hover:bg-red-500/10"
                            aria-label="Quitar horario"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>

                        {/* "Cualquier día" → permite excluir días (ej. sáb/dom). */}
                        {w.dow === null && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-white/45">Excluir:</span>
                            {DOW_LABELS.map((d, idx) => {
                              const excluded = (w.excludeDows ?? []).includes(idx);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    const cur = w.excludeDows ?? [];
                                    patchWindow(i, {
                                      excludeDows: excluded
                                        ? cur.filter((x) => x !== idx)
                                        : [...cur, idx],
                                    });
                                  }}
                                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${
                                    excluded
                                      ? 'border-red-500/40 bg-red-500/15 text-red-300 line-through'
                                      : 'border-white/12 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]'
                                  }`}
                                >
                                  {d}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={addWindow}
                  className="text-primary hover:text-primary/80 inline-flex items-center gap-1.5 text-xs font-medium transition"
                >
                  <Plus className="size-3.5" /> Agregar horario
                </button>
              </div>
            </div>
          )}

          {/* Footer del wizard */}
          <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-4">
            {step === 1 ? (
              <Button
                key="cancel"
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={pending}
                className="rounded-full"
              >
                Cancelar
              </Button>
            ) : (
              <Button
                key="back"
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                disabled={pending}
                className="rounded-full"
              >
                <ArrowLeft className="mr-1.5 size-4" />
                Atrás
              </Button>
            )}

            {step === 1 ? (
              <Button
                key="next"
                type="button"
                onClick={goNext}
                className="rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)]"
              >
                Siguiente
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
            ) : (
              <Button
                key="save"
                type="button"
                onClick={handleSave}
                disabled={pending}
                className="rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)]"
              >
                {pending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                {isEdit ? 'Guardar cambios' : 'Crear punto'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
