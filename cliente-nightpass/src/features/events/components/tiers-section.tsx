'use client';

import * as React from 'react';
import { Loader2, Plus, Trash2, TrendingUp, Pencil, X } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { ConfirmDialog } from '@/core/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/core/components/ui/dialog';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import type { LoyaltyTier, TierPricePhase } from '@/core/types/api';
import { TIER_STYLES } from '@/features/loyalty';
import { useEventDetail } from '../hooks/use-event-detail';
import { useCreateTier } from '../hooks/use-create-tier';
import { useUpdateTier } from '../hooks/use-update-tier';
import { useDeleteTier } from '../hooks/use-delete-tier';
import { computeTierBreakdown, formatCents, STRIPE_FEE_PCT, STRIPE_FIXED_CENTS } from '@/core/lib/utils/fees';

const LOYALTY_TIER_OPTIONS: { value: '' | LoyaltyTier; label: string }[] = [
  { value: '', label: 'Abierto a todos' },
  { value: 'ROOKIE', label: 'Rookie y arriba' },
  { value: 'REGULAR', label: 'Regular y arriba' },
  { value: 'INSIDER', label: 'Insider y arriba' },
  { value: 'VIP', label: 'Solo VIP' },
];

const DAY_MS = 86_400_000;

interface Props {
  eventId: string;
}

function formatPrice(cents: number, currency: string) {
  const symbol = currency === 'MXN' ? '$' : currency === 'EUR' ? '€' : '$';
  return `${symbol}${(cents / 100).toFixed(2)} ${currency}`;
}

/** Fecha absoluta de activación de una fase: startsAt − N días. */
function phaseDate(eventStartsAt: string | undefined, days: number): Date | null {
  if (!eventStartsAt) return null;
  const t = new Date(eventStartsAt).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t - days * DAY_MS);
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

// ── Editor de fases (reusado en crear y editar) ──────────────────────────────

interface PhaseDraft {
  price: string;
  days: string;
}

function PhaseListEditor({
  phases,
  onChange,
  eventStartsAt,
  currency,
}: {
  phases: PhaseDraft[];
  onChange: (next: PhaseDraft[]) => void;
  eventStartsAt: string | undefined;
  currency: string;
}) {
  const update = (i: number, patch: Partial<PhaseDraft>) =>
    onChange(phases.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const remove = (i: number) => onChange(phases.filter((_, idx) => idx !== i));
  const add = () => onChange([...phases, { price: '', days: '' }]);

  return (
    <div className="space-y-2">
      {phases.length > 0 ? (
        <div className="flex items-center gap-2 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="w-[110px]">Sube a (MXN)</span>
          <span className="w-[90px]">Días antes</span>
          <span className="min-w-0 flex-1" />
        </div>
      ) : null}
      {phases.map((p, i) => {
        const daysNum = parseInt(p.days, 10);
        const d = !Number.isNaN(daysNum) ? phaseDate(eventStartsAt, daysNum) : null;
        const priceNum = parseFloat(p.price);
        return (
          <div key={i} className="flex items-center gap-2">
            <Input
              className="w-[110px]"
              type="number"
              step="0.01"
              min="0"
              placeholder="150.00"
              aria-label="Precio de la subida (MXN)"
              value={p.price}
              onChange={(e) => update(i, { price: e.target.value })}
            />
            <Input
              className="w-[90px]"
              type="number"
              min="0"
              max="365"
              placeholder="14"
              aria-label="Días antes del evento"
              value={p.days}
              onChange={(e) => update(i, { days: e.target.value })}
            />
            <span className="flex h-9 min-w-0 flex-1 items-center text-[11px] text-muted-foreground">
              {d && !Number.isNaN(priceNum) && priceNum > 0
                ? `→ ${formatPrice(Math.round(priceNum * 100), currency)} desde ${formatShortDate(d)}`
                : 'precio · días'}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-9 shrink-0 p-0 text-destructive/70 hover:text-destructive"
              title="Quitar fase"
              onClick={() => remove(i)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        );
      })}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs text-primary"
        onClick={add}
      >
        <Plus className="size-3.5" /> Agregar subida
      </Button>
    </div>
  );
}

/** Valida y convierte los borradores de fase a TierPricePhase[]. Lanza string de error. */
function parsePhases(phases: PhaseDraft[]): TierPricePhase[] {
  const out: TierPricePhase[] = [];
  for (const p of phases) {
    if (p.price.trim() === '' && p.days.trim() === '') continue; // fila vacía → ignora
    const priceFloat = parseFloat(p.price);
    if (Number.isNaN(priceFloat) || priceFloat <= 0) {
      throw new Error('Cada subida necesita un precio válido mayor a 0.');
    }
    const days = parseInt(p.days, 10);
    if (Number.isNaN(days) || days < 0 || days > 365) {
      throw new Error('Los “días antes” deben ser un entero entre 0 y 365.');
    }
    out.push({ priceCents: Math.round(priceFloat * 100), daysBeforeEvent: days });
  }
  return out;
}

// ── Diálogo de edición de precios de un tier existente ───────────────────────

function EditTierPricesDialog({
  eventId,
  tier,
  eventStartsAt,
  open,
  onOpenChange,
}: {
  eventId: string;
  tier: TierRowProps['tier'];
  eventStartsAt: string | undefined;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const updateTier = useUpdateTier(eventId);
  const [basePrice, setBasePrice] = React.useState((tier.priceCents / 100).toFixed(2));
  const [phases, setPhases] = React.useState<PhaseDraft[]>(
    (tier.prices ?? []).map((p) => ({
      price: (p.priceCents / 100).toFixed(2),
      days: String(p.daysBeforeEvent),
    })),
  );
  const [error, setError] = React.useState<string | null>(null);

  // Re-sembrar al abrir con otro tier.
  React.useEffect(() => {
    if (open) {
      setBasePrice((tier.priceCents / 100).toFixed(2));
      setPhases(
        (tier.prices ?? []).map((p) => ({
          price: (p.priceCents / 100).toFixed(2),
          days: String(p.daysBeforeEvent),
        })),
      );
      setError(null);
    }
    // Solo re-sembrar al abrir (o al abrir otro tier), no en refetches de fondo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tier.id]);

  const save = async () => {
    setError(null);
    const baseFloat = parseFloat(basePrice);
    if (Number.isNaN(baseFloat) || baseFloat < 0) {
      setError('Precio base inválido.');
      return;
    }
    let parsed: TierPricePhase[];
    try {
      parsed = parsePhases(phases);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    try {
      await updateTier.mutateAsync({
        tierId: tier.id,
        input: { priceCents: Math.round(baseFloat * 100), prices: parsed },
      });
      onOpenChange(false);
    } catch {
      // toast en hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Precios de “{tier.name}”</DialogTitle>
          <DialogDescription>
            El precio base es el early-bird. Agrega subidas que se activan X días
            antes del evento. El precio se cobra según la fecha de compra.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Precio base / early-bird (MXN)" htmlFor="edit-base-price" error={undefined}>
            <Input
              id="edit-base-price"
              type="number"
              step="0.01"
              min="0"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
            />
          </Field>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary/70">
              Subidas programadas
            </p>
            <PhaseListEditor
              phases={phases}
              onChange={setPhases}
              eventStartsAt={eventStartsAt}
              currency={tier.currency}
            />
          </div>

          {error ? <p className="text-xs text-amber-300">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" disabled={updateTier.isPending} onClick={save}>
              {updateTier.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Guardar precios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Fila de tier ─────────────────────────────────────────────────────────────

interface TierRowProps {
  eventId: string;
  eventStartsAt: string | undefined;
  tier: {
    id: string;
    name: string;
    priceCents: number;
    currency: string;
    capacity: number | null;
    minLoyaltyTier?: LoyaltyTier | null;
    prices?: TierPricePhase[];
  };
}

function TierRow({ eventId, eventStartsAt, tier }: TierRowProps) {
  const deleteTier = useDeleteTier(eventId);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);

  const phases = [...(tier.prices ?? [])].sort(
    (a, b) => b.daysBeforeEvent - a.daysBeforeEvent,
  );

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{tier.name}</p>
            {tier.minLoyaltyTier ? (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-primary">
                Min {TIER_STYLES[tier.minLoyaltyTier].label}
              </span>
            ) : null}
            {phases.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-300">
                <TrendingUp className="size-2.5" /> {phases.length} subida{phases.length === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatPrice(tier.priceCents, tier.currency)}
            {tier.capacity ? ` · cupo ${tier.capacity}` : ' · sin límite'}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0 text-muted-foreground hover:text-foreground"
          title="Editar precios escalonados"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0 text-destructive/70 hover:text-destructive"
          title="Eliminar tier"
          disabled={deleteTier.isPending}
          onClick={() => setConfirmOpen(true)}
        >
          {deleteTier.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
        </Button>
      </div>

      {/* Calendario de subidas */}
      {phases.length > 0 ? (
        <ul className="mt-2 space-y-0.5 border-t border-white/8 pt-2 text-[11px] text-muted-foreground">
          {phases.map((p, i) => {
            const d = phaseDate(eventStartsAt, p.daysBeforeEvent);
            return (
              <li key={i} className="flex items-center gap-1.5">
                <TrendingUp className="size-2.5 text-emerald-300/70" />
                {formatPrice(p.priceCents, tier.currency)} · {p.daysBeforeEvent} día
                {p.daysBeforeEvent === 1 ? '' : 's'} antes
                {d ? ` (desde ${formatShortDate(d)})` : ''}
              </li>
            );
          })}
        </ul>
      ) : null}

      <EditTierPricesDialog
        eventId={eventId}
        tier={tier}
        eventStartsAt={eventStartsAt}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Eliminar tier?"
        description={`"${tier.name}" se eliminará permanentemente. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        variant="destructive"
        loading={deleteTier.isPending}
        onConfirm={() => deleteTier.mutate(tier.id, { onSettled: () => setConfirmOpen(false) })}
      />
    </div>
  );
}

export function TiersSection({ eventId }: Props) {
  const detail = useEventDetail(eventId);
  const createTier = useCreateTier(eventId);

  const [name, setName] = React.useState('');
  const [priceMxn, setPriceMxn] = React.useState('');
  const [capacity, setCapacity] = React.useState('');
  const [minLoyaltyTier, setMinLoyaltyTier] = React.useState<'' | LoyaltyTier>('');
  const [phases, setPhases] = React.useState<PhaseDraft[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const tiers = detail.data?.tiers ?? [];
  const eventStartsAt = detail.data?.startsAt;
  const eventCapacity = detail.data?.capacity ?? null;
  const sumExisting = tiers.reduce((acc, t) => acc + (t.capacity ?? 0), 0);
  const remaining =
    eventCapacity != null ? Math.max(eventCapacity - sumExisting, 0) : null;
  const platformFeePct =
    detail.data?.venue?.platformFeePct ??
    detail.data?.promoter?.platformFeePct ??
    0;
  const priceFloat = parseFloat(priceMxn);
  const previewCents =
    !isNaN(priceFloat) && priceFloat > 0 ? Math.round(priceFloat * 100) : 0;
  const breakdown = computeTierBreakdown(previewCents, platformFeePct);

  const reset = () => {
    setName('');
    setPriceMxn('');
    setCapacity('');
    setMinLoyaltyTier('');
    setPhases([]);
    setError(null);
  };

  const submit = async () => {
    setError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Nombre debe tener al menos 2 caracteres');
      return;
    }
    const priceFloat = parseFloat(priceMxn);
    if (isNaN(priceFloat) || priceFloat < 0) {
      setError('Precio inválido');
      return;
    }
    const priceCents = Math.round(priceFloat * 100);

    const capacityInt = capacity ? parseInt(capacity, 10) : undefined;
    if (capacity && (isNaN(capacityInt!) || capacityInt! < 1)) {
      setError('Capacidad debe ser un entero positivo');
      return;
    }
    if (
      capacityInt != null &&
      eventCapacity != null &&
      capacityInt > eventCapacity
    ) {
      setError(
        `El cupo (${capacityInt}) no puede exceder la capacidad del evento (${eventCapacity}).`,
      );
      return;
    }
    if (
      capacityInt != null &&
      eventCapacity != null &&
      sumExisting + capacityInt > eventCapacity
    ) {
      setError(
        `Excede capacidad del evento. Disponible: ${remaining}.`,
      );
      return;
    }

    let parsedPhases: TierPricePhase[];
    try {
      parsedPhases = parsePhases(phases);
    } catch (e) {
      setError((e as Error).message);
      return;
    }

    try {
      await createTier.mutateAsync({
        name: trimmedName,
        priceCents,
        currency: 'MXN',
        capacity: capacityInt,
        position: tiers.length,
        minLoyaltyTier: minLoyaltyTier === '' ? null : minLoyaltyTier,
        prices: parsedPhases.length ? parsedPhases : undefined,
      });
      reset();
    } catch {
      // toast handled in hook
    }
  };

  return (
    <div className="space-y-4 border-t border-white/10 pt-5">
      <div>
        <h4 className="font-display text-base font-semibold">Tiers de precio</h4>
        <p className="text-xs text-muted-foreground">
          Cada tier es una categoría de pase con su precio. Puedes programar
          subidas (early-bird) que encarecen al acercarse el evento.
        </p>
      </div>

      {/* Lista existente */}
      {detail.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando tiers…
        </div>
      ) : tiers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/15 bg-white/[0.015] p-3 text-center text-xs text-muted-foreground">
          Aún no hay tiers. Agrega al menos uno para vender.
        </p>
      ) : (
        <div className="space-y-2">
          {tiers.map((t) => (
            <TierRow key={t.id} eventId={eventId} eventStartsAt={eventStartsAt} tier={t} />
          ))}
        </div>
      )}

      {/* Crear tier — div, no form (no se puede anidar form en HTML) */}
      <div
        className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-3"
        onKeyDown={(e) => {
          // Enter en cualquier input dispara el submit, sin disparar el form padre
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
            e.preventDefault();
            submit();
          }
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">
          Agregar tier nuevo
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nombre" htmlFor="tier-name" error={undefined}>
            <Input
              id="tier-name"
              placeholder="Ej. General"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Precio base (MXN)" htmlFor="tier-price" error={undefined}>
            <Input
              id="tier-price"
              type="number"
              step="0.01"
              min="0"
              placeholder="200.00"
              value={priceMxn}
              onChange={(e) => setPriceMxn(e.target.value)}
            />
          </Field>
          <Field
            label="Cupo (opcional)"
            htmlFor="tier-capacity"
            error={undefined}
          >
            <Input
              id="tier-capacity"
              type="number"
              min="1"
              max={remaining ?? undefined}
              placeholder={
                remaining != null ? `Máx ${remaining}` : 'Sin límite'
              }
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
            {eventCapacity != null ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Cap. evento: {eventCapacity} · disponible: {remaining}
              </p>
            ) : null}
          </Field>
        </div>

        <Field
          label="Tier mínimo (loyalty)"
          htmlFor="tier-min-loyalty"
          error={undefined}
        >
          <select
            id="tier-min-loyalty"
            value={minLoyaltyTier}
            onChange={(e) => setMinLoyaltyTier(e.target.value as '' | LoyaltyTier)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {LOYALTY_TIER_OPTIONS.map((opt) => (
              <option key={opt.value || 'open'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Restringe la compra a usuarios con este nivel de NightPass o
            superior. Por defecto, abierto a todos.
          </p>
        </Field>

        {/* Subidas de precio programadas (opcional) */}
        <div className="rounded-lg border border-white/10 bg-white/[0.015] p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary/70">
            Subidas de precio (opcional)
          </p>
          <p className="mb-2 text-[11px] text-muted-foreground">
            El precio base aplica desde ya. Cada subida encarece el pase X días
            antes del evento. Ej: $150 a 14 días, $200 a 7 días, $250 a 1 día.
          </p>
          <PhaseListEditor
            phases={phases}
            onChange={setPhases}
            eventStartsAt={eventStartsAt}
            currency="MXN"
          />
        </div>

        {previewCents > 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs">
            <p className="mb-2 font-semibold uppercase tracking-wider text-primary/70">
              Cálculo · qué te queda (precio base)
            </p>
            <dl className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Cliente paga</dt>
                <dd className="font-semibold tabular-nums">{formatCents(breakdown.grossCents)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">
                  Stripe ({STRIPE_FEE_PCT}% + ${(STRIPE_FIXED_CENTS / 100).toFixed(0)} MXN)
                </dt>
                <dd className="tabular-nums text-rose-300/90">
                  − {formatCents(breakdown.stripeCents)}
                </dd>
              </div>
              {platformFeePct > 0 ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">
                    NightPass ({platformFeePct}%)
                  </dt>
                  <dd className="tabular-nums text-rose-300/90">
                    − {formatCents(breakdown.platformCents)}
                  </dd>
                </div>
              ) : null}
              <div className="mt-1 flex items-center justify-between gap-3 border-t border-white/8 pt-1.5">
                <dt className="font-semibold text-foreground">Recibes</dt>
                <dd className="font-display text-base font-bold tabular-nums text-emerald-300">
                  {formatCents(breakdown.netCents)}
                </dd>
              </div>
              <p className="pt-1 text-[10px] text-muted-foreground/80">
                Comisión total: {breakdown.totalFeePct.toFixed(1)}%
              </p>
            </dl>
          </div>
        ) : null}

        {error ? (
          <p className="text-xs text-amber-300">{error}</p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={createTier.isPending}
            className="gap-1.5 rounded-full"
            onClick={submit}
          >
            {createTier.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Agregar tier
          </Button>
        </div>
      </div>
    </div>
  );
}
