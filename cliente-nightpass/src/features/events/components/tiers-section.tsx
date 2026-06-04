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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/core/components/ui/tabs';
import type { CashFeeMode, LoyaltyTier, TierPricePhase } from '@/core/types/api';
import { TIER_STYLES } from '@/features/loyalty';
import { useEventDetail } from '../hooks/use-event-detail';
import { useCreateTier } from '../hooks/use-create-tier';
import { useUpdateTier } from '../hooks/use-update-tier';
import { useDeleteTier } from '../hooks/use-delete-tier';
import {
  computeTierBreakdown,
  computeGrossForNet,
  computeCashUnitPrice,
  stripeFeeForGross,
  formatCents,
  STRIPE_FEE_PCT,
  STRIPE_FIXED_CENTS,
} from '@/core/lib/utils/fees';

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

// ── Config de pago en efectivo (físico), reusada en crear y editar ───────────

interface CashDraft {
  /** Cobrar comisión en efectivo. Si false => exento (cashExemptOverride=true). */
  charge: boolean;
  /** % de comisión (string editable). Vacío => heredar el % del owner. */
  pct: string;
  /** Modo: SUMA al precio (cliente paga más) o DESCUENTA (paga menos). */
  mode: CashFeeMode;
  /** Precio en efectivo propio (string MXN). Vacío => derivar del online (bruto − Stripe). */
  price: string;
}

/** Valor por defecto de la config de efectivo (hereda: cobra comisión, modo descontar). */
function defaultCashDraft(ownerFeePct: number): CashDraft {
  return {
    charge: true,
    pct: ownerFeePct > 0 ? String(ownerFeePct) : '',
    mode: 'SUBTRACT',
    price: '',
  };
}

/** Precio en efectivo propio (centavos) del borrador, o null si está vacío. */
function cashPriceCentsFromDraft(d: CashDraft): number | null {
  const n = parseFloat(d.price);
  if (d.price.trim() === '' || Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

/**
 * Traduce el borrador de efectivo a los 3 campos override del payload.
 * Mantiene null = heredar:
 *  - charge=true + pct == ownerFeePct  => no override de %/exento (hereda)
 *  - charge=false                      => cashExemptOverride=true
 *  - mode=SUBTRACT                     => cashFeeMode=null (comportamiento actual)
 */
function cashDraftToPayload(d: CashDraft, ownerFeePct: number) {
  const pctNum = d.pct.trim() === '' ? null : parseFloat(d.pct);
  const cashExemptOverride = d.charge ? null : true;
  // Solo mandamos override de % si el usuario puso un valor distinto al del owner.
  let cashFeePctOverride: number | null = null;
  if (d.charge && pctNum != null && !Number.isNaN(pctNum) && pctNum !== ownerFeePct) {
    cashFeePctOverride = pctNum;
  }
  const cashFeeMode: CashFeeMode | null = d.mode === 'ADD' ? 'ADD' : null;
  const cashPriceCents = cashPriceCentsFromDraft(d);
  return { cashFeeMode, cashFeePctOverride, cashExemptOverride, cashPriceCents };
}

/** % efectivo a usar para el preview/cálculo (override > owner). */
function effectiveCashPct(d: CashDraft, ownerFeePct: number): number {
  const pctNum = parseFloat(d.pct);
  if (d.pct.trim() !== '' && !Number.isNaN(pctNum)) return Math.max(0, pctNum);
  return Math.max(0, ownerFeePct);
}

function CashConfigEditor({
  cash,
  onChange,
  ownerFeePct,
  grossUnitCents,
}: {
  cash: CashDraft;
  onChange: (next: CashDraft) => void;
  ownerFeePct: number;
  grossUnitCents: number;
}) {
  const exempt = !cash.charge;
  const feePctEff = effectiveCashPct(cash, ownerFeePct);
  const overrideCents = cashPriceCentsFromDraft(cash);
  const hasOwnPrice = overrideCents != null;
  // Base = precio propio si se fijó, o (bruto − Stripe) si se deriva del online.
  const base = hasOwnPrice
    ? overrideCents
    : grossUnitCents > 0
      ? Math.max(0, grossUnitCents - stripeFeeForGross(grossUnitCents))
      : 0;
  const cashPrice = computeCashUnitPrice(grossUnitCents, feePctEff, exempt, cash.mode, overrideCents);
  const commBase = hasOwnPrice ? overrideCents : grossUnitCents;
  const npComm = exempt ? 0 : Math.round((commBase * feePctEff) / 100);
  const canPreview = hasOwnPrice || grossUnitCents > 0;

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        El boleto sigue siendo digital; el dinero se entrega en efectivo en la
        puerta. Define el precio en efectivo y cómo se aplica la comisión de
        NightPass (el cobro real de la comisión usa el monedero prepagado).
      </p>

      {/* Precio en efectivo propio */}
      <Field label="Precio en efectivo (MXN)" htmlFor="cash-price" error={undefined}>
        <Input
          id="cash-price"
          type="number"
          step="0.01"
          min="0"
          placeholder={
            grossUnitCents > 0
              ? `Auto: ${formatCents(Math.max(0, grossUnitCents - stripeFeeForGross(grossUnitCents)))}`
              : 'Ej. 250'
          }
          value={cash.price}
          onChange={(e) => onChange({ ...cash, price: e.target.value })}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Lo que el cliente entrega en efectivo. Vacío = derivar del precio en
          línea menos Stripe.
        </p>
      </Field>

      {/* Toggle: cobrar comisión en efectivo */}
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/14 bg-white/[0.035] px-3 py-2.5">
        <span className="min-w-0">
          <span className="block text-sm font-medium">Cobrar comisión en efectivo</span>
          <span className="block text-[11px] text-muted-foreground">
            {cash.charge
              ? 'Activo: se aplica la comisión NightPass a las ventas en efectivo.'
              : 'Exento: este boleto no paga comisión NightPass en efectivo.'}
          </span>
        </span>
        <input
          type="checkbox"
          className="size-5 shrink-0 accent-[#a855f7]"
          checked={cash.charge}
          onChange={(e) => onChange({ ...cash, charge: e.target.checked })}
        />
      </label>

      {/* % de comisión */}
      <Field
        label={`% comisión efectivo${ownerFeePct > 0 ? ` (default ${ownerFeePct}%)` : ''}`}
        htmlFor="cash-fee-pct"
        error={undefined}
      >
        <Input
          id="cash-fee-pct"
          type="number"
          step="0.1"
          min="0"
          max="100"
          placeholder={ownerFeePct > 0 ? String(ownerFeePct) : '0'}
          disabled={!cash.charge}
          value={cash.pct}
          onChange={(e) => onChange({ ...cash, pct: e.target.value })}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Vacío = heredar el % del organizador. Override solo para este boleto.
        </p>
      </Field>

      {/* Modo: sumar / descontar */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-primary/70">
          Modo de comisión
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onChange({ ...cash, mode: 'SUBTRACT' })}
            className={`flex-1 rounded-md border px-2 py-2 text-[11px] font-semibold transition ${
              cash.mode === 'SUBTRACT'
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-white/14 text-muted-foreground hover:bg-white/5'
            }`}
          >
            Descontar
            <span className="mt-0.5 block text-[9px] font-normal opacity-80">
              cliente paga menos
            </span>
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...cash, mode: 'ADD' })}
            className={`flex-1 rounded-md border px-2 py-2 text-[11px] font-semibold transition ${
              cash.mode === 'ADD'
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-white/14 text-muted-foreground hover:bg-white/5'
            }`}
          >
            Sumar
            <span className="mt-0.5 block text-[9px] font-normal opacity-80">
              cliente paga más
            </span>
          </button>
        </div>
      </div>

      {/* Preview del precio en efectivo */}
      {canPreview ? (
        <div className="rounded-lg border border-white/14 bg-white/[0.05] p-3 text-xs">
          <p className="mb-2 font-semibold uppercase tracking-wider text-primary/70">
            Precio en efectivo · qué entrega el cliente
          </p>
          <dl className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">
                {hasOwnPrice ? 'Precio en efectivo' : 'Base (precio − Stripe)'}
              </dt>
              <dd className="tabular-nums">{formatCents(base)}</dd>
            </div>
            {cash.mode === 'ADD' && !exempt ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">
                  + NightPass ({feePctEff}%)
                </dt>
                <dd className="tabular-nums text-emerald-300/90">
                  + {formatCents(npComm)}
                </dd>
              </div>
            ) : null}
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-white/12 pt-1.5">
              <dt className="font-semibold text-foreground">Paga en efectivo</dt>
              <dd className="font-display text-base font-bold tabular-nums text-emerald-300">
                {formatCents(cashPrice)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">
                Recibes{!exempt ? ` (− comisión ${feePctEff}%)` : ''}
              </dt>
              <dd className="tabular-nums">
                {formatCents(cash.mode === 'ADD' ? base : Math.max(0, base - npComm))}
              </dd>
            </div>
            <p className="pt-1 text-[10px] text-muted-foreground/80">
              {exempt
                ? 'Exento: sin comisión NightPass; recibes el precio completo.'
                : cash.mode === 'ADD'
                  ? 'La comisión se suma al precio; la organización la recupera del cliente.'
                  : 'La comisión la absorbe la organización vía monedero; el cliente paga la base.'}
            </p>
          </dl>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-white/18 bg-white/[0.025] p-2.5 text-center text-[11px] text-muted-foreground">
          Pon un precio en efectivo arriba, o define el precio en la pestaña “En
          línea” para derivarlo.
        </p>
      )}
    </div>
  );
}

// ── Diálogo de edición de precios de un tier existente ───────────────────────

function EditTierPricesDialog({
  eventId,
  tier,
  eventStartsAt,
  ownerFeePct,
  open,
  onOpenChange,
}: {
  eventId: string;
  tier: TierRowProps['tier'];
  eventStartsAt: string | undefined;
  ownerFeePct: number;
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
  const [cash, setCash] = React.useState<CashDraft>(() => tierToCashDraft(tier, ownerFeePct));
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
      setCash(tierToCashDraft(tier, ownerFeePct));
      setError(null);
    }
    // Solo re-sembrar al abrir (o al abrir otro tier), no en refetches de fondo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tier.id]);

  // Precio bruto unitario para el preview de efectivo: precio base editado.
  const baseFloat = parseFloat(basePrice);
  const grossUnitCents = !Number.isNaN(baseFloat) && baseFloat > 0 ? Math.round(baseFloat * 100) : 0;

  const save = async () => {
    setError(null);
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
    const cashPayload = cashDraftToPayload(cash, ownerFeePct);
    try {
      await updateTier.mutateAsync({
        tierId: tier.id,
        input: {
          priceCents: Math.round(baseFloat * 100),
          prices: parsed,
          ...cashPayload,
        },
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
            Configura el precio en línea (Stripe) y el precio físico (efectivo)
            de este boleto.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="online">
          <TabsList className="w-full">
            <TabsTrigger value="online">En línea</TabsTrigger>
            <TabsTrigger value="cash">Físico</TabsTrigger>
          </TabsList>

          <TabsContent value="online" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="cash" className="space-y-4">
            <CashConfigEditor
              cash={cash}
              onChange={setCash}
              ownerFeePct={ownerFeePct}
              grossUnitCents={grossUnitCents}
            />
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          {error ? <p className="text-xs text-amber-300">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" disabled={updateTier.isPending} onClick={save}>
              {updateTier.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Reconstruye el borrador de efectivo desde los overrides persistidos del tier. */
function tierToCashDraft(tier: TierRowProps['tier'], ownerFeePct: number): CashDraft {
  const charge = tier.cashExemptOverride === true ? false : true;
  const pctOverride = tier.cashFeePctOverride;
  const pct =
    pctOverride != null
      ? String(pctOverride)
      : ownerFeePct > 0
        ? String(ownerFeePct)
        : '';
  const mode: CashFeeMode = tier.cashFeeMode === 'ADD' ? 'ADD' : 'SUBTRACT';
  const price =
    tier.cashPriceCents != null ? (tier.cashPriceCents / 100).toFixed(2) : '';
  return { charge, pct, mode, price };
}

// ── Fila de tier ─────────────────────────────────────────────────────────────

interface TierRowProps {
  eventId: string;
  eventStartsAt: string | undefined;
  ownerFeePct: number;
  tier: {
    id: string;
    name: string;
    priceCents: number;
    currency: string;
    capacity: number | null;
    minLoyaltyTier?: LoyaltyTier | null;
    prices?: TierPricePhase[];
    cashFeeMode?: CashFeeMode | null;
    cashFeePctOverride?: number | null;
    cashExemptOverride?: boolean | null;
    cashPriceCents?: number | null;
  };
}

function TierRow({ eventId, eventStartsAt, ownerFeePct, tier }: TierRowProps) {
  const deleteTier = useDeleteTier(eventId);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);

  const phases = [...(tier.prices ?? [])].sort(
    (a, b) => b.daysBeforeEvent - a.daysBeforeEvent,
  );

  return (
    <div className="rounded-lg border border-white/14 bg-white/[0.05] px-3 py-2 text-sm">
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
        <ul className="mt-2 space-y-0.5 border-t border-white/12 pt-2 text-[11px] text-muted-foreground">
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
        ownerFeePct={ownerFeePct}
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
  // Modo de definición del precio base:
  //  - 'gross': el dueño escribe lo que paga el cliente (se le descuentan fees).
  //  - 'net':   el dueño escribe lo que quiere RECIBIR; calculamos el precio a
  //             cobrar para que le quede eso completo.
  const [priceMode, setPriceMode] = React.useState<'gross' | 'net'>('gross');
  const [priceMxn, setPriceMxn] = React.useState('');
  const [netMxn, setNetMxn] = React.useState('');
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
  // Config de efectivo del nuevo tier (default = hereda owner, modo descontar).
  const [cash, setCash] = React.useState<CashDraft>(() => defaultCashDraft(platformFeePct ?? 0));
  // Re-sembrar el % default cuando llega el feePct del owner (carga async del detalle).
  React.useEffect(() => {
    setCash((prev) =>
      prev.pct === '' && platformFeePct > 0 ? { ...prev, pct: String(platformFeePct) } : prev,
    );
  }, [platformFeePct]);
  // Precio bruto (lo que paga el cliente) según el modo elegido.
  const priceFloat = parseFloat(priceMxn);
  const netFloat = parseFloat(netMxn);
  const previewCents =
    priceMode === 'net'
      ? !isNaN(netFloat) && netFloat > 0
        ? computeGrossForNet(Math.round(netFloat * 100), platformFeePct ?? 0)
        : 0
      : !isNaN(priceFloat) && priceFloat > 0
        ? Math.round(priceFloat * 100)
        : 0;
  const breakdown = computeTierBreakdown(previewCents, platformFeePct ?? 0);

  const reset = () => {
    setName('');
    setPriceMxn('');
    setNetMxn('');
    setPriceMode('gross');
    setCapacity('');
    setMinLoyaltyTier('');
    setPhases([]);
    setCash(defaultCashDraft(platformFeePct ?? 0));
    setError(null);
  };

  const submit = async () => {
    setError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Nombre debe tener al menos 2 caracteres');
      return;
    }
    // El precio que se guarda siempre es el bruto (lo que paga el cliente). En
    // modo 'net' ya viene calculado desde el neto deseado (previewCents).
    if (previewCents <= 0) {
      setError(priceMode === 'net' ? 'Indica cuánto quieres recibir' : 'Precio inválido');
      return;
    }
    const priceCents = previewCents;

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

    const cashPayload = cashDraftToPayload(cash, platformFeePct ?? 0);

    try {
      await createTier.mutateAsync({
        name: trimmedName,
        priceCents,
        currency: 'MXN',
        capacity: capacityInt,
        position: tiers.length,
        minLoyaltyTier: minLoyaltyTier === '' ? null : minLoyaltyTier,
        prices: parsedPhases.length ? parsedPhases : undefined,
        ...cashPayload,
      });
      reset();
    } catch {
      // toast handled in hook
    }
  };

  return (
    <div className="space-y-4 border-t border-white/14 pt-5">
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
        <p className="rounded-lg border border-dashed border-white/18 bg-white/[0.025] p-3 text-center text-xs text-muted-foreground">
          Aún no hay tiers. Agrega al menos uno para vender.
        </p>
      ) : (
        <div className="space-y-2">
          {tiers.map((t) => (
            <TierRow
              key={t.id}
              eventId={eventId}
              eventStartsAt={eventStartsAt}
              ownerFeePct={platformFeePct ?? 0}
              tier={t}
            />
          ))}
        </div>
      )}

      {/* Crear tier — div, no form (no se puede anidar form en HTML) */}
      <div
        className="space-y-3 rounded-lg border border-white/14 bg-white/[0.035] p-3"
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

        <Tabs defaultValue="online">
          <TabsList className="w-full">
            <TabsTrigger value="online">En línea</TabsTrigger>
            <TabsTrigger value="cash">Físico</TabsTrigger>
          </TabsList>

          <TabsContent value="online" className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nombre" htmlFor="tier-name" error={undefined}>
            <Input
              id="tier-name"
              placeholder="Ej. General"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field
            label={priceMode === 'net' ? 'Quiero recibir (MXN)' : 'Precio base (MXN)'}
            htmlFor="tier-price"
            error={undefined}
          >
            <Input
              id="tier-price"
              type="number"
              step="0.01"
              min="0"
              placeholder={priceMode === 'net' ? '200.00' : '200.00'}
              value={priceMode === 'net' ? netMxn : priceMxn}
              onChange={(e) =>
                priceMode === 'net'
                  ? setNetMxn(e.target.value)
                  : setPriceMxn(e.target.value)
              }
            />
            <div className="mt-1.5 flex gap-1">
              <button
                type="button"
                onClick={() => setPriceMode('gross')}
                className={`flex-1 rounded-md border px-2 py-1 text-[10px] font-semibold transition ${
                  priceMode === 'gross'
                    ? 'border-primary/50 bg-primary/15 text-primary'
                    : 'border-white/14 text-muted-foreground hover:bg-white/5'
                }`}
              >
                Precio al cliente
              </button>
              <button
                type="button"
                onClick={() => setPriceMode('net')}
                className={`flex-1 rounded-md border px-2 py-1 text-[10px] font-semibold transition ${
                  priceMode === 'net'
                    ? 'border-primary/50 bg-primary/15 text-primary'
                    : 'border-white/14 text-muted-foreground hover:bg-white/5'
                }`}
              >
                Lo que quiero recibir
              </button>
            </div>
            {priceMode === 'net' && previewCents > 0 ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Debes listarlo en{' '}
                <span className="font-semibold text-emerald-300">
                  {formatCents(previewCents)}
                </span>{' '}
                para recibir ~{formatCents(parseFloat(netMxn || '0') * 100 || 0)}
              </p>
            ) : null}
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
        <div className="rounded-lg border border-white/14 bg-white/[0.025] p-3">
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
          <div className="rounded-lg border border-white/14 bg-white/[0.05] p-3 text-xs">
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
              <div className="mt-1 flex items-center justify-between gap-3 border-t border-white/12 pt-1.5">
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
          </TabsContent>

          <TabsContent value="cash" className="space-y-3">
            <CashConfigEditor
              cash={cash}
              onChange={setCash}
              ownerFeePct={platformFeePct ?? 0}
              grossUnitCents={previewCents}
            />
          </TabsContent>
        </Tabs>

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
