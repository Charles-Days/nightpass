'use client';

import * as React from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { ConfirmDialog } from '@/core/components/ui/confirm-dialog';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import type { LoyaltyTier } from '@/core/types/api';
import { TIER_STYLES } from '@/features/loyalty';
import { useEventDetail } from '../hooks/use-event-detail';
import { useCreateTier } from '../hooks/use-create-tier';
import { useDeleteTier } from '../hooks/use-delete-tier';
import { computeTierBreakdown, formatCents, STRIPE_FEE_PCT, STRIPE_FIXED_CENTS } from '@/core/lib/utils/fees';

const LOYALTY_TIER_OPTIONS: { value: '' | LoyaltyTier; label: string }[] = [
  { value: '', label: 'Abierto a todos' },
  { value: 'ROOKIE', label: 'Rookie y arriba' },
  { value: 'REGULAR', label: 'Regular y arriba' },
  { value: 'INSIDER', label: 'Insider y arriba' },
  { value: 'VIP', label: 'Solo VIP' },
];

interface Props {
  eventId: string;
}

function formatPrice(cents: number, currency: string) {
  const symbol = currency === 'MXN' ? '$' : currency === 'EUR' ? '€' : '$';
  return `${symbol}${(cents / 100).toFixed(2)} ${currency}`;
}

interface TierRowProps {
  eventId: string;
  tier: {
    id: string;
    name: string;
    priceCents: number;
    currency: string;
    capacity: number | null;
    minLoyaltyTier?: LoyaltyTier | null;
  };
}

function TierRow({ eventId, tier }: TierRowProps) {
  const deleteTier = useDeleteTier(eventId);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{tier.name}</p>
          {tier.minLoyaltyTier ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-primary">
              Min {TIER_STYLES[tier.minLoyaltyTier].label}
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
  const [error, setError] = React.useState<string | null>(null);

  const tiers = detail.data?.tiers ?? [];
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

    try {
      await createTier.mutateAsync({
        name: trimmedName,
        priceCents,
        currency: 'MXN',
        capacity: capacityInt,
        position: tiers.length,
        minLoyaltyTier: minLoyaltyTier === '' ? null : minLoyaltyTier,
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
          Cada tier es una categoría de pase con su precio. Sin tiers no se
          puede vender.
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
            <TierRow key={t.id} eventId={eventId} tier={t} />
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
          <Field label="Precio (MXN)" htmlFor="tier-price" error={undefined}>
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

        {previewCents > 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs">
            <p className="mb-2 font-semibold uppercase tracking-wider text-primary/70">
              Cálculo · qué te queda
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
