'use client';

import * as React from 'react';
import {
  ArrowLeft,
  Boxes,
  Check,
  Coins,
  Gift,
  Loader2,
  Plus,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { ConfirmDialog } from '@/core/components/ui/confirm-dialog';
import { ImageUploader } from '@/core/components/image-uploader';
import {
  type CreateRewardBody,
  type OwnerReward,
  type RewardKind,
  useCreateReward,
  useDeleteReward,
  useOwnerRewards,
  useRewardEvents,
  useRewardEventTiers,
  useUpdateReward,
  useValidateCoupon,
} from './use-rewards-admin';

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

// ─── Metadatos de los 4 tipos fijos ─────────────────────────────────────────
const KIND_META: Record<
  RewardKind,
  { label: string; short: string; desc: string; Icon: React.ElementType }
> = {
  VENUE_PERK: {
    label: 'Perk en el lugar',
    short: 'Perk',
    desc: 'Gasta NPP, se valida en puerta.',
    Icon: Gift,
  },
  TICKET_DISCOUNT: {
    label: 'Descuento en entrada',
    short: 'Descuento',
    desc: 'Gasta NPP, descuento al comprar online.',
    Icon: Ticket,
  },
  BULK_PROMO: {
    label: 'Promo por volumen',
    short: 'Volumen',
    desc: 'Gratis por comprar N boletos, elige 1 opción.',
    Icon: Boxes,
  },
  PHYSICAL_BONUS_NPP: {
    label: 'NPP dobles (efectivo)',
    short: 'NPP dobles',
    desc: 'NPP extra al pagar en efectivo con RP.',
    Icon: Coins,
  },
};

export function RewardsManager({
  venueId,
  promoterId,
}: {
  venueId?: string;
  promoterId?: string;
}) {
  const { data: rewards, isLoading } = useOwnerRewards(venueId, promoterId);
  const create = useCreateReward();
  const update = useUpdateReward();
  const del = useDeleteReward();
  const [open, setOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<OwnerReward | null>(null);

  const toggleActive = (r: OwnerReward) =>
    update.mutate(
      { id: r.id, body: { active: !r.active } },
      { onError: () => toast.error('No se pudo actualizar') },
    );

  const confirmDelete = () => {
    if (!toDelete) return;
    del.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success('Recompensa eliminada');
        setToDelete(null);
      },
      onError: () => toast.error('No se pudo eliminar'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Recompensas que tus clientes canjean con sus NPP. Las fondeas tú.
        </p>
        <Button onClick={() => setOpen(true)} className="shrink-0 gap-1.5">
          <Plus className="size-4" />
          Nueva
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : (rewards ?? []).length === 0 ? (
        <div className="rounded-[18px] border border-white/12 bg-white/[0.03] p-6 text-center text-sm text-muted-foreground">
          Aún no tienes recompensas. Crea una con el botón “Nueva”.
        </div>
      ) : (
        <ul className="space-y-2">
          {rewards!.map((r) => {
            const meta = KIND_META[r.kind];
            const Icon = meta?.Icon ?? Gift;
            return (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-[14px] border border-white/12 bg-white/[0.04] px-4 py-3"
              >
                {r.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.imageUrl}
                    alt={r.title}
                    className="size-9 shrink-0 rounded-[10px] border border-white/12 object-cover"
                  />
                ) : (
                  <span className="grid size-9 place-items-center rounded-[10px] bg-primary/15 text-primary">
                    <Icon className="size-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{r.title}</p>
                    <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/70">
                      {meta?.short ?? r.kind}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {rewardSubtitle(r)}
                  </p>
                  {r.endsAt ? (
                    <p className="text-[10px] text-amber-300/80">
                      Vigente hasta {formatValidityDate(r.endsAt)}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => toggleActive(r)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                    r.active
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-white/10 text-white/50'
                  }`}
                >
                  {r.active ? 'Activa' : 'Inactiva'}
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(r)}
                  className="text-white/40 transition hover:text-rose-300"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <CouponValidator />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Eliminar recompensa"
        description={
          toDelete ? `¿Eliminar "${toDelete.title}"? No se puede deshacer.` : ''
        }
        confirmLabel="Eliminar"
        variant="destructive"
        loading={del.isPending}
        onConfirm={confirmDelete}
      />

      <CreateRewardDialog
        open={open}
        onClose={() => setOpen(false)}
        venueId={venueId}
        promoterId={promoterId}
        creating={create.isPending}
        onCreate={(body) =>
          create.mutate(body, {
            onSuccess: () => {
              toast.success('Recompensa creada');
              setOpen(false);
            },
            onError: (e) =>
              toast.error(e instanceof Error ? e.message : 'No se pudo crear'),
          })
        }
      />
    </div>
  );
}

function rewardSubtitle(r: OwnerReward): string {
  switch (r.kind) {
    case 'VENUE_PERK':
      return `${r.costNpp} NPP${r.description ? ` · ${r.description}` : ''}`;
    case 'TICKET_DISCOUNT': {
      const disc =
        r.discountType === 'PERCENT'
          ? `${r.discountValue}% OFF`
          : r.discountType === 'FIXED'
            ? `$${(r.discountValue / 100).toFixed(2)} OFF`
            : '';
      return `${r.costNpp} NPP · ${disc}`;
    }
    case 'BULK_PROMO':
      return `${r.minQuantity ?? '?'} boletos · ${r.options?.length ?? 0} opciones`;
    case 'PHYSICAL_BONUS_NPP':
      return `+${r.bonusNpp ?? 0} NPP al pagar en efectivo`;
    default:
      return r.description ?? '';
  }
}

/** "12 jun" — fecha corta en español para el hint de vigencia. */
function formatValidityDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

// ─── Dialog de creación ──────────────────────────────────────────────────────
function CreateRewardDialog({
  open,
  onClose,
  venueId,
  promoterId,
  creating,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  venueId?: string;
  promoterId?: string;
  creating: boolean;
  onCreate: (body: CreateRewardBody) => void;
}) {
  const [kind, setKind] = React.useState<RewardKind | null>(null);

  // Campos comunes
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [costNpp, setCostNpp] = React.useState(500);
  const [discountType, setDiscountType] = React.useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = React.useState(10);
  const [eventId, setEventId] = React.useState('');
  const [tierId, setTierId] = React.useState('');
  const [minQuantity, setMinQuantity] = React.useState(2);
  const [bonusNpp, setBonusNpp] = React.useState(100);
  const [options, setOptions] = React.useState<string[]>(['']);

  // Campos opcionales comunes a todos los tipos
  const [imageUrl, setImageUrl] = React.useState<string | undefined>(undefined);
  const [startsAt, setStartsAt] = React.useState('');
  const [endsAt, setEndsAt] = React.useState('');

  const events = useRewardEvents(venueId, promoterId);
  const tiers = useRewardEventTiers(eventId || undefined);

  const reset = React.useCallback(() => {
    setKind(null);
    setTitle('');
    setDescription('');
    setCostNpp(500);
    setDiscountType('PERCENT');
    setDiscountValue(10);
    setEventId('');
    setTierId('');
    setMinQuantity(2);
    setBonusNpp(100);
    setOptions(['']);
    setImageUrl(undefined);
    setStartsAt('');
    setEndsAt('');
  }, []);

  const close = () => {
    reset();
    onClose();
  };

  const submit = () => {
    if (!kind) return;
    if (!title.trim()) {
      toast.error('Completa el título');
      return;
    }

    // Vigencia opcional: convertir datetime-local a ISO, omitir si vacío.
    let startsAtISO: string | undefined;
    let endsAtISO: string | undefined;
    if (startsAt) {
      const d = new Date(startsAt);
      if (Number.isNaN(d.getTime())) {
        toast.error('La fecha "Desde" no es válida');
        return;
      }
      startsAtISO = d.toISOString();
    }
    if (endsAt) {
      const d = new Date(endsAt);
      if (Number.isNaN(d.getTime())) {
        toast.error('La fecha "Hasta" no es válida');
        return;
      }
      endsAtISO = d.toISOString();
    }
    if (startsAtISO && endsAtISO && new Date(endsAtISO) <= new Date(startsAtISO)) {
      toast.error('La fecha "Hasta" debe ser posterior a "Desde"');
      return;
    }

    const base: CreateRewardBody = {
      venueId,
      promoterId,
      kind,
      title: title.trim(),
      description: description.trim() || undefined,
      costNpp: 0,
      imageUrl: imageUrl || undefined,
      startsAt: startsAtISO,
      endsAt: endsAtISO,
    };

    if (kind === 'VENUE_PERK') {
      if (costNpp < 1) {
        toast.error('El costo debe ser al menos 1 NPP');
        return;
      }
      onCreate({ ...base, costNpp });
      return;
    }

    if (kind === 'TICKET_DISCOUNT') {
      if (costNpp < 1) {
        toast.error('El costo debe ser al menos 1 NPP');
        return;
      }
      if (discountValue < 1) {
        toast.error('Ingresa el valor del descuento');
        return;
      }
      if (discountType === 'PERCENT' && discountValue > 100) {
        toast.error('El porcentaje no puede superar 100');
        return;
      }
      if (!eventId) {
        toast.error('Selecciona el evento del descuento');
        return;
      }
      onCreate({
        ...base,
        costNpp,
        discountType,
        discountValue,
        eventId,
      });
      return;
    }

    if (kind === 'BULK_PROMO') {
      if (!eventId) {
        toast.error('Selecciona un evento');
        return;
      }
      if (minQuantity < 2) {
        toast.error('El mínimo de boletos debe ser 2 o más');
        return;
      }
      const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
      if (cleanOptions.length < 1) {
        toast.error('Agrega al menos una opción');
        return;
      }
      if (cleanOptions.length > 6) {
        toast.error('Máximo 6 opciones');
        return;
      }
      onCreate({
        ...base,
        costNpp: 0,
        eventId,
        tierId: tierId || undefined,
        minQuantity,
        options: cleanOptions.map((label) => ({ label })),
      });
      return;
    }

    if (kind === 'PHYSICAL_BONUS_NPP') {
      if (!eventId) {
        toast.error('Selecciona un evento');
        return;
      }
      if (bonusNpp < 1) {
        toast.error('Los NPP extra deben ser al menos 1');
        return;
      }
      onCreate({ ...base, costNpp: 0, eventId, bonusNpp });
      return;
    }
  };

  const updateOption = (i: number, value: string) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  const addOption = () =>
    setOptions((prev) => (prev.length >= 6 ? prev : [...prev, '']));
  const removeOption = (i: number) =>
    setOptions((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {kind && (
              <button
                type="button"
                onClick={() => setKind(null)}
                className="text-white/50 transition hover:text-white"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            {kind ? KIND_META[kind].label : 'Nueva recompensa'}
          </DialogTitle>
        </DialogHeader>

        {/* Paso 1: elegir tipo */}
        {!kind ? (
          <div className="grid gap-2.5 py-1">
            {(Object.keys(KIND_META) as RewardKind[]).map((k) => {
              const { label, desc, Icon } = KIND_META[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className="flex items-start gap-3 rounded-[14px] border border-white/12 bg-white/[0.04] px-4 py-3 text-left transition hover:border-primary/40 hover:bg-primary/10"
                >
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary/15 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block text-[11px] text-muted-foreground">{desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          /* Paso 2: campos según tipo */
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Título</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Trago de bienvenida"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Descripción
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
              />
            </div>

            {kind === 'VENUE_PERK' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Costo (NPP)
                </label>
                <Input
                  type="number"
                  value={costNpp}
                  onChange={(e) => setCostNpp(Number(e.target.value))}
                  min={1}
                />
              </div>
            )}

            {kind === 'TICKET_DISCOUNT' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Costo (NPP)
                    </label>
                    <Input
                      type="number"
                      value={costNpp}
                      onChange={(e) => setCostNpp(Number(e.target.value))}
                      min={1}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Tipo de descuento
                    </label>
                    <select
                      className={SELECT_CLASS}
                      value={discountType}
                      onChange={(e) =>
                        setDiscountType(e.target.value as 'PERCENT' | 'FIXED')
                      }
                    >
                      <option value="PERCENT">Porcentaje (%)</option>
                      <option value="FIXED">Monto fijo ($)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {discountType === 'PERCENT' ? '% de descuento' : 'Monto ($)'}
                  </label>
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    min={1}
                    max={discountType === 'PERCENT' ? 100 : undefined}
                    placeholder={discountType === 'PERCENT' ? '10' : '5000 (centavos)'}
                  />
                  {discountType === 'FIXED' && (
                    <p className="text-[10px] text-muted-foreground">
                      En centavos. Ej. 5000 = $50.00
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Evento
                  </label>
                  <EventSelect
                    value={eventId}
                    onChange={setEventId}
                    loading={events.isLoading}
                    options={events.data ?? []}
                    placeholder="Selecciona un evento"
                  />
                </div>
              </>
            )}

            {kind === 'BULK_PROMO' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Evento
                  </label>
                  <EventSelect
                    value={eventId}
                    onChange={(v) => {
                      setEventId(v);
                      setTierId('');
                    }}
                    loading={events.isLoading}
                    options={events.data ?? []}
                    placeholder="Selecciona un evento"
                  />
                </div>
                {eventId && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Tier (opcional)
                    </label>
                    <select
                      className={SELECT_CLASS}
                      value={tierId}
                      onChange={(e) => setTierId(e.target.value)}
                      disabled={tiers.isLoading}
                    >
                      <option value="">Cualquier tier</option>
                      {(tiers.data ?? []).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Mínimo de boletos
                  </label>
                  <Input
                    type="number"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(Number(e.target.value))}
                    min={2}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">
                      Opciones (elige 1) · {options.length}/6
                    </label>
                    <button
                      type="button"
                      onClick={addOption}
                      disabled={options.length >= 6}
                      className="flex items-center gap-1 text-[11px] font-medium text-primary transition hover:text-primary/80 disabled:opacity-40"
                    >
                      <Plus className="size-3" />
                      Agregar
                    </button>
                  </div>
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder='Ej. Botella Jose Cuervo'
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        disabled={options.length <= 1}
                        className="shrink-0 text-white/40 transition hover:text-rose-300 disabled:opacity-30"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {kind === 'PHYSICAL_BONUS_NPP' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Evento
                  </label>
                  <EventSelect
                    value={eventId}
                    onChange={setEventId}
                    loading={events.isLoading}
                    options={events.data ?? []}
                    placeholder="Selecciona un evento"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    NPP extra
                  </label>
                  <Input
                    type="number"
                    value={bonusNpp}
                    onChange={(e) => setBonusNpp(Number(e.target.value))}
                    min={1}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Se otorgan al confirmar el RP el pago en efectivo.
                  </p>
                </div>
              </>
            )}

            {/* ─── Opcionales comunes a todos los tipos ─── */}
            <div className="space-y-4 border-t border-white/10 pt-4">
              <ImageUploader
                value={imageUrl}
                onChange={setImageUrl}
                kind="event"
                label="Banner (opcional)"
                hint="Imagen que verá el cliente. Déjalo vacío si no aplica."
                aspect="video"
              />

              <div className="space-y-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Vigencia (opcional)
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    Opcional. Déjalo vacío para que no caduque.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Desde
                    </label>
                    <input
                      type="datetime-local"
                      className={SELECT_CLASS}
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Hasta
                    </label>
                    <input
                      type="datetime-local"
                      className={SELECT_CLASS}
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {kind && (
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={creating} className="gap-1.5">
              {creating && <Loader2 className="size-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EventSelect({
  value,
  onChange,
  loading,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  loading: boolean;
  options: { id: string; title: string }[];
  placeholder: string;
}) {
  return (
    <select
      className={SELECT_CLASS}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading}
    >
      <option value="">{loading ? 'Cargando eventos…' : placeholder}</option>
      {options.map((e) => (
        <option key={e.id} value={e.id}>
          {e.title}
        </option>
      ))}
    </select>
  );
}

/** Staff valida un cupón por código (escaneo con cámara: fase próxima). */
function CouponValidator() {
  const [code, setCode] = React.useState('');
  const validate = useValidateCoupon();

  const submit = () => {
    const c = code.trim().toUpperCase();
    if (c.length < 6) {
      toast.error('Código inválido');
      return;
    }
    validate.mutate(c, {
      onSuccess: (res) => {
        const detail = [res.optionLabel, res.eventTitle].filter(Boolean).join(' · ');
        toast.success(`✓ ${res.title} — ${res.customer}`, {
          description: detail || undefined,
        });
        setCode('');
      },
      onError: (e) =>
        toast.error(e instanceof Error ? e.message : 'Cupón no válido'),
    });
  };

  return (
    <div className="rounded-[18px] border border-white/12 bg-white/[0.04] p-5">
      <h3 className="text-sm font-semibold">Validar cupón</h3>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Pide al cliente su código y valídalo aquí.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Código del cupón"
          className="font-mono uppercase tracking-widest"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <Button onClick={submit} disabled={validate.isPending} className="shrink-0 gap-1.5">
          {validate.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : validate.isSuccess ? (
            <Check className="size-4" />
          ) : validate.isError ? (
            <X className="size-4" />
          ) : null}
          Validar
        </Button>
      </div>
    </div>
  );
}
