'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadStripe, type Stripe as StripeJs } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { ArrowLeft, Check, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/core/components/ui/button';
import { clientFetch, ClientApiError } from '@/core/lib/api/client-client';
import { paths } from '@/core/config/paths';
import type { CatalogTierDetail, Order, OrderCreationResponse } from '@/core/types/api';
import { saveRpRef, readRpRef, clearRpRef } from '@/features/rp-referral/rp-referral';
import { MEXICO_GEO } from '@/core/data/mexico-geo';
import {
  BulkChooseDialog,
  useAvailableRewards,
  type BulkPendingItem,
  type BulkPendingResponse,
} from '@/features/rewards';
import { PickupModal } from './pickup-modal';

type Phase =
  | 'select_quantity'
  | 'creating'
  | 'paying'
  | 'processing'
  | 'success'
  | 'cash_submitting'
  | 'cash_done'
  | 'duplicate'
  | 'no_stripe'
  | 'sold_out'
  | 'event_started'
  | 'event_unavailable'
  | 'free_tier'
  | 'error';

interface StripeInitState {
  promise: Promise<StripeJs | null>;
  key: string;
}

const stripeCache = new Map<string, Promise<StripeJs | null>>();

function getStripePromise(publishableKey: string | undefined): StripeInitState | null {
  const key = publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  if (!key) return null;
  const cached = stripeCache.get(key);
  if (cached) return { promise: cached, key };
  const promise = loadStripe(key);
  stripeCache.set(key, promise);
  return { promise, key };
}

function formatMoney(cents: number, currency: string): string {
  const value = cents / 100;
  const code = currency.toUpperCase();
  const symbol = code === 'EUR' ? '€' : '$';
  return `${symbol}${value.toFixed(2)} ${code}`;
}

function formatEventDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface ApiErrorInfo {
  message: string;
  errorCode: string | null;
  passId: string | null;
}

function readApiError(error: unknown): ApiErrorInfo {
  if (error instanceof ClientApiError) {
    const payload = error.payload as
      | { message?: string | string[]; errorCode?: string; passId?: string }
      | null;
    const message = payload?.message
      ? Array.isArray(payload.message)
        ? payload.message.join(', ')
        : payload.message
      : `Error ${error.status}`;
    return {
      message,
      errorCode: payload?.errorCode ?? null,
      passId: payload?.passId ?? null,
    };
  }
  if (error instanceof Error) {
    return { message: error.message, errorCode: null, passId: null };
  }
  return { message: 'Ocurrió un error inesperado', errorCode: null, passId: null };
}

function phaseForErrorCode(code: string | null): Phase {
  switch (code) {
    case 'NO_STRIPE':
    case 'STRIPE_DISABLED':
    case 'STRIPE_MISSING_CLIENT_SECRET':
      return 'no_stripe';
    case 'LIMIT_EXCEEDED':
    case 'DUPLICATE_PASS':
      return 'duplicate';
    case 'TIER_SOLD_OUT':
      return 'sold_out';
    case 'EVENT_STARTED':
      return 'event_started';
    case 'EVENT_NOT_PUBLISHED':
      return 'event_unavailable';
    case 'FREE_TIER':
      return 'free_tier';
    default:
      return 'error';
  }
}

interface CheckoutClientProps {
  tierId: string;
  initialTier: CatalogTierDetail | null;
  /** Pases que el user ya tiene para este evento (capa el máximo a 6 por cuenta). */
  alreadyOwned?: number;
}

const MAX_PER_ACCOUNT = 6;

export function CheckoutClient({ tierId, initialTier, alreadyOwned = 0 }: CheckoutClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingOrderId = searchParams.get('orderId');
  // Recompensa TICKET_DISCOUNT a aplicar (id), llega desde la página del evento.
  const rewardId = searchParams.get('reward');

  // Cuántos pases más puede comprar antes de tocar el límite por cuenta.
  const maxQuantity = Math.max(0, MAX_PER_ACCOUNT - alreadyOwned);
  const limitReached = !!initialTier && maxQuantity <= 0;

  // Pago en efectivo (boleto digital, cobro físico vía RP) habilitado por evento.
  const allowCash = initialTier?.event?.allowCashPayment === true;
  // Stripe no configurado para este evento. Con efectivo disponible NO bloquea:
  // el cliente igual puede solicitar pago en efectivo.
  const paymentsOff = !!initialTier && initialTier.paymentsEnabled === false;
  const onlineUnavailable = paymentsOff;

  const [phase, setPhase] = useState<Phase>(
    paymentsOff && !allowCash
      ? 'no_stripe'
      : limitReached
        ? 'duplicate'
        : 'select_quantity',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    paymentsOff && !allowCash
      ? 'Este local aún no completó la configuración de pagos. Vuelve más tarde.'
      : limitReached
        ? `Ya compraste el máximo de ${MAX_PER_ACCOUNT} pases para este evento con esta cuenta. No puedes comprar más.`
        : null,
  );
  // Método elegido. Si online no está disponible pero hay efectivo, arranca en efectivo.
  const [method, setMethod] = useState<'online' | 'cash'>(
    onlineUnavailable && allowCash ? 'cash' : 'online',
  );
  const [duplicatePassId, setDuplicatePassId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(existingOrderId);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [stripeInit, setStripeInit] = useState<StripeInitState | null>(null);
  const [manualRpCode, setManualRpCode] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  // Descuento aplicado por la recompensa (centavos), lo devuelve POST /orders.
  const [discountCents, setDiscountCents] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Promo BULK (regalo por comprar N boletos) detectada tras completar la orden.
  // Se elige antes del redirect final a "Mis pases".
  const [bulkPromo, setBulkPromo] = useState<BulkPendingItem | null>(null);
  // Destino del redirect post-compra, retenido mientras el modal de promo está
  // abierto. Cuando el usuario cierra el cupón, navegamos aquí.
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
  // Teléfono/WhatsApp para pago en efectivo. Si el usuario ya tiene uno
  // guardado lo reusamos; si no, se lo pedimos esta primera vez.
  const [phone, setPhone] = useState('');
  const [hasSavedPhone, setHasSavedPhone] = useState(false);

  // Ubicación del cliente — para enrutar la solicitud al RP de su zona. Se pide
  // la primera vez (si no la tenemos) y se reutiliza.
  const [stateName, setStateName] = useState('');
  const [city, setCity] = useState('');
  const [hasSavedLocation, setHasSavedLocation] = useState(false);
  const cashCities = useMemo(
    () => MEXICO_GEO.find((e) => e.estado === stateName)?.ciudades ?? [],
    [stateName],
  );

  // Punto de cobro elegido por el cliente (efectivo). Se abre un modal antes de
  // enviar la solicitud para que escoja dónde y cuándo recoger.
  const [pickupOpen, setPickupOpen] = useState(false);
  const [pickup, setPickup] = useState<{
    pickupPointId?: string;
    pickupAt: string | null;
  } | null>(null);

  const initRef = useRef(false);

  const createOrder = useCallback(async (customCode?: string, currentQty = quantity) => {
    setPhase('creating');
    setErrorMessage(null);
    setDuplicatePassId(null);
    try {
      const urlRef = searchParams.get('ref');
      if (urlRef) {
        saveRpRef(urlRef);
      }
      
      const resolvedCode = customCode !== undefined
        ? (customCode || undefined)
        : (urlRef || readRpRef() || undefined);

      const res = await clientFetch<OrderCreationResponse>('/api/orders', {
        method: 'POST',
        body: {
          tierId,
          referralCode: resolvedCode,
          quantity: currentQty,
          ...(rewardId ? { rewardId } : {}),
        },
      });

      if (resolvedCode) {
        setAppliedCode(resolvedCode);
      }

      setDiscountCents(res.discountCents ?? 0);

      // ── Dev bypass: el backend ya completó la orden sin Stripe ──────────
      const isDevBypass = res.clientSecret.includes('devbypasssecret');
      if (isDevBypass) {
        setOrderId(res.orderId);
        setPhase('processing'); // salta directo al polling; la orden ya es COMPLETED
        return;
      }

      // ── Flujo normal Stripe ───────────────────────────────────────────────
      const stripeState = getStripePromise(res.publishableKey);
      if (!stripeState) {
        setPhase('no_stripe');
        setErrorMessage(
          'Stripe no está configurado. Falta NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY o publishableKey del backend.',
        );
        return;
      }

      setStripeInit(stripeState);
      setOrderId(res.orderId);
      setClientSecret(res.clientSecret);

      try {
        const detail = await clientFetch<Order>(`/api/orders/${res.orderId}`);
        setOrder(detail);
      } catch {
        setOrder({
          id: res.orderId,
          userId: '',
          eventId: initialTier?.event.id ?? '',
          tierId,
          status: 'PENDING',
          quantity: currentQty,
          totalCents: res.totalCents,
          applicationFeeCents: 0,
          currency: res.currency,
          stripePaymentIntentId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      setPhase('paying');
    } catch (error) {
      const info = readApiError(error);
      const nextPhase = phaseForErrorCode(info.errorCode);
      setPhase(nextPhase);
      setErrorMessage(info.message);
      if (info.passId) setDuplicatePassId(info.passId);
      if (nextPhase === 'error') toast.error(info.message);
    }
  }, [initialTier, tierId, quantity, rewardId, searchParams]);

  // Solicita pago en EFECTIVO: notifica por correo a los RPs asignados; uno
  // cobra en persona y confirma → el pase se emite a la cuenta del cliente.
  const requestCash = useCallback(async (
    sel?: { pickupPointId?: string; pickupAt: string | null } | null,
    currentQty = quantity,
  ) => {
    // Si no nos pasan la selección explícita, caemos al state actual.
    const selection = sel !== undefined ? sel : pickup;
    setPhase('cash_submitting');
    setErrorMessage(null);
    try {
      const urlRef = searchParams.get('ref');
      if (urlRef) saveRpRef(urlRef);
      await clientFetch('/api/physical-payments', {
        method: 'POST',
        body: {
          tierId,
          quantity: currentQty,
          ...(phone.trim() ? { contactPhone: phone.trim() } : {}),
          ...(stateName.trim() ? { state: stateName.trim() } : {}),
          ...(city.trim() ? { city: city.trim() } : {}),
          ...(selection?.pickupPointId ? { pickupPointId: selection.pickupPointId } : {}),
          ...(selection?.pickupAt ? { pickupAt: selection.pickupAt } : {}),
        },
      });
      setPhase('cash_done');
    } catch (error) {
      const info = readApiError(error);
      setPhase('error');
      setErrorMessage(info.message);
      toast.error(info.message);
    }
  }, [tierId, quantity, searchParams, phone, stateName, city, pickup]);

  // Carga el teléfono guardado del usuario (solo si el evento acepta efectivo).
  useEffect(() => {
    if (!allowCash) return;
    let cancelled = false;
    void (async () => {
      try {
        const me = await clientFetch<{
          phone?: string | null;
          state?: string | null;
          city?: string | null;
        }>('/api/auth/me');
        if (cancelled) return;
        if (me.phone) {
          setPhone(me.phone);
          setHasSavedPhone(true);
        }
        if (me.state) setStateName(me.state);
        if (me.city) setCity(me.city);
        if (me.state && me.city) setHasSavedLocation(true);
      } catch {
        // sin datos guardados → se los pediremos
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowCash]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    if (initialTier && initialTier.paymentsEnabled === false) {
      return;
    }

    if (existingOrderId) {
      setOrderId(existingOrderId);
      setPhase('processing');
      return;
    }
  }, [existingOrderId, initialTier]);

  useEffect(() => {
    if (phase !== 'processing' || !orderId) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async () => {
      while (!cancelled && attempts < maxAttempts) {
        attempts += 1;
        try {
          const fresh = await clientFetch<Order & { passes?: Array<{ id: string }> }>(`/api/orders/${orderId}`);
          if (cancelled) return;
          setOrder(fresh);

          if (fresh.status === 'COMPLETED' && fresh.passes && fresh.passes.length > 0) {
            clearRpRef();
            setPhase('success');
            const target = fresh.passes.length === 1
              ? `${paths.pases}/${fresh.passes[0].id}`
              : paths.pases;

            // Antes del redirect, revisa si esta compra desbloqueó una promo BULK
            // (regalo por comprar N boletos) que el usuario debe elegir. Si hay,
            // abrimos el modal y retenemos el redirect hasta que cierre el cupón.
            let promo: BulkPendingItem | null = null;
            if (orderId) {
              try {
                const pending = await clientFetch<BulkPendingResponse>(
                  '/api/rewards/bulk/pending',
                );
                promo = pending.items.find((it) => it.orderId === orderId) ?? null;
              } catch {
                // sin promo / error de red → seguimos con el flujo normal
              }
            }

            if (cancelled) return;
            if (promo) {
              setBulkPromo(promo);
              setPendingRedirect(target);
            } else {
              router.replace(target);
            }
            return;
          }

          if (fresh.status === 'FAILED' || fresh.status === 'REFUNDED') {
            setPhase('error');
            setErrorMessage('El pago no se completó. Si se cobró el monto será reembolsado.');
            return;
          }
        } catch {
          // tolerate intermittent errors and continue polling
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (!cancelled) {
        setPhase('error');
        setErrorMessage(
          'Pago confirmado pero el pase aún no se generó. Revisa "Mis pases" en unos minutos.',
        );
      }
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [phase, orderId, router]);

  const summary = useMemo(() => {
    const tier = order?.eventTier;
    const event = order?.event;
    const initEvent = initialTier?.event as any;
    const currentQty = order?.quantity ?? quantity;
    const singlePrice = tier?.priceCents ?? initialTier?.priceCents ?? 0;
    return {
      title: event?.title ?? initEvent?.title ?? 'Evento',
      venueName:
        event?.venue?.name ??
        initEvent?.venue?.name ??
        initEvent?.promoter?.externalVenueName ??
        initEvent?.promoter?.name,
      city:
        event?.venue?.city ??
        initEvent?.venue?.city ??
        initEvent?.promoter?.externalVenueCity,
      startsAt: event?.startsAt ?? initEvent?.startsAt,
      tierName: tier?.name ?? initialTier?.name ?? 'Pase',
      totalCents:
        order?.totalCents ?? (singlePrice * quantity),
      currency:
        order?.currency ?? tier?.currency ?? initialTier?.currency ?? 'MXN',
      quantity: currentQty,
    };
  }, [order, initialTier, quantity]);

  // Precio en EFECTIVO: bruto − Stripe (− NP si exento). Lo calcula el backend y
  // viaja en cashPriceCents. Si el método es efectivo, el total mostrado y el
  // cobro usan este precio (más bajo que online).
  const cashSingle = initialTier?.cashPriceCents ?? null;
  const cashTotalCents =
    cashSingle != null ? cashSingle * summary.quantity : null;
  const showCashPrice = method === 'cash' && cashTotalCents != null;

  // Preview del descuento ANTES de crear la orden: busca el reward del ?reward=
  // y calcula el descuento sobre el subtotal, para mostrarlo en verde de una.
  const availableRewards = useAvailableRewards();
  const previewReward = rewardId
    ? (availableRewards.data?.rewards ?? []).find((r) => r.id === rewardId)
    : undefined;
  const unitCents =
    order?.eventTier?.priceCents ?? initialTier?.priceCents ?? 0;
  const subtotalCents =
    discountCents > 0 ? summary.totalCents + discountCents : unitCents * quantity;
  const previewDiscountCents = (() => {
    if (showCashPrice || !previewReward) return 0;
    if (previewReward.discountType === 'PERCENT') {
      return Math.min(
        subtotalCents,
        Math.floor((subtotalCents * previewReward.discountValue) / 100),
      );
    }
    if (previewReward.discountType === 'FIXED') {
      return Math.min(subtotalCents, previewReward.discountValue);
    }
    return 0;
  })();
  // El descuento real (orden ya creada) manda; si no, el preview.
  const effDiscountCents = discountCents > 0 ? discountCents : previewDiscountCents;
  // El descuento de recompensa aplica solo al pago en línea (Stripe). En efectivo
  // el precio ya viene optimizado por el backend.
  const showDiscount = !showCashPrice && effDiscountCents > 0;
  const onlineTotalCents = Math.max(0, subtotalCents - effDiscountCents);
  const displayTotalCents = showCashPrice ? cashTotalCents! : onlineTotalCents;
  const cashSavingsCents = summary.totalCents - (cashTotalCents ?? summary.totalCents);

  const backToEvent = initialTier
    ? `${paths.evento}/${initialTier.event.id}`
    : paths.appHome;

  const isErrorPhase =
    phase === 'error' ||
    phase === 'duplicate' ||
    phase === 'sold_out' ||
    phase === 'event_started' ||
    phase === 'event_unavailable';

  return (
    <div className="mx-auto w-full max-w-md px-5 py-6 sm:py-10">
      <Link
        href={backToEvent}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground active:scale-95 transform-gpu"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>

      <header className="mt-5 np-rise" style={{ animationDelay: '40ms' }}>
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Checkout
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">Confirma tu pase</h1>
      </header>

      <section className="mt-6 overflow-hidden rounded-[22px] border border-white/14 bg-white/[0.05] p-5 np-rise" style={{ animationDelay: '120ms' }}>
        <div>
          <p className="font-display text-base font-semibold leading-tight">{summary.title}</p>
          {(summary.venueName || summary.startsAt) && (
            <p className="mt-1 text-xs text-muted-foreground">
              {[summary.venueName, summary.startsAt ? formatEventDate(summary.startsAt) : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>

        <div className="my-4 h-px bg-white/8" />

        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-muted-foreground">
            {summary.tierName} <span className="text-xs text-muted-foreground/60">(x{summary.quantity})</span>
          </span>
          <span className="font-display text-sm font-medium tabular-nums">
            {showCashPrice && cashSavingsCents > 0 && (
              <span className="mr-2 text-xs font-normal text-muted-foreground/60 line-through">
                {formatMoney(summary.totalCents, summary.currency)}
              </span>
            )}
            {formatMoney(showDiscount ? subtotalCents : displayTotalCents, summary.currency)}
          </span>
        </div>

        {showDiscount && (
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-emerald-300">Descuento recompensa</span>
            <span className="font-display text-sm font-medium tabular-nums text-emerald-300">
              −{formatMoney(effDiscountCents, summary.currency)}
            </span>
          </div>
        )}

        <div className="my-4 h-px bg-white/8" />

        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-semibold">Total</span>
          <span className="font-display text-2xl font-bold tabular-nums text-primary">
            {formatMoney(displayTotalCents, summary.currency)}
          </span>
        </div>
        {showCashPrice && cashSavingsCents > 0 && (
          <p className="mt-1.5 text-right text-[11px] text-emerald-400/90">
            Precio en efectivo — sin comisión de Stripe
          </p>
        )}

        {/* Código de RP */}
        <div className="mt-4 border-t border-white/10 pt-4">
          <details className="group text-xs">
            <summary className="flex cursor-pointer items-center justify-between text-muted-foreground hover:text-foreground transition-colors">
              <span>¿Tienes un código de RP?</span>
              <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full group-open:hidden">
                {appliedCode ? `Aplicado: ${appliedCode}` : 'Agregar'}
              </span>
            </summary>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Ej. CARLOS-A3F2"
                value={manualRpCode}
                onChange={e => setManualRpCode(e.target.value.toUpperCase())}
                className="h-9 flex-1 rounded-xl border border-white/14 bg-black/40 px-3 text-xs text-white placeholder-white/30 focus:border-primary/50 focus:outline-none"
              />
              <Button
                type="button"
                onClick={() => void createOrder(manualRpCode)}
                className="h-9 rounded-xl bg-white/10 px-4 text-xs font-semibold hover:bg-white/20 active:scale-95"
              >
                Aplicar
              </Button>
            </div>
            {appliedCode && (
              <p className="mt-2 text-[10px] text-emerald-400 font-medium">
                Código activo: {appliedCode}
              </p>
            )}
          </details>
        </div>

        {initialTier?.nextPrice ? (
          <p className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-center text-[11px] font-semibold text-amber-200">
            Aprovecha: sube a{' '}
            {formatMoney(initialTier.nextPrice.priceCents, summary.currency)} el{' '}
            {new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(
              new Date(initialTier.nextPrice.startsAt),
            )}
          </p>
        ) : null}
      </section>

      <section
        key={phase}
        className={`mt-5 rounded-[22px] border border-white/14 bg-white/[0.05] p-5 transform-gpu ${isErrorPhase ? 'np-shake border-red-400/20' : 'np-rise'}`}
        style={{ animationDelay: '180ms' }}
      >
        {phase === 'select_quantity' && (
          <div className="space-y-4 py-2">
            {allowCash && (
              <div className="space-y-2">
                <p className="text-center text-sm font-medium text-neutral-300">
                  ¿Cómo quieres pagar?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={onlineUnavailable}
                    onClick={() => setMethod('online')}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      method === 'online'
                        ? 'border-primary/50 bg-primary/15 text-white'
                        : 'border-white/14 bg-white/[0.035] text-muted-foreground hover:bg-white/[0.08]'
                    } ${onlineUnavailable ? 'cursor-not-allowed opacity-40' : ''}`}
                  >
                    En línea
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('cash')}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      method === 'cash'
                        ? 'border-primary/50 bg-primary/15 text-white'
                        : 'border-white/14 bg-white/[0.035] text-muted-foreground hover:bg-white/[0.08]'
                    }`}
                  >
                    En efectivo
                  </button>
                </div>
                {method === 'cash' && (
                  <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                    Boleto digital, pago físico. Un vendedor (RP) te contactará para cobrarte; tu pase se emite cuando confirme.
                  </p>
                )}
                {method === 'cash' && hasSavedPhone && (
                  <p className="text-center text-[11px] text-emerald-400/90">
                    Te contactaremos por WhatsApp al <strong>{phone}</strong>
                  </p>
                )}
                {method === 'cash' && !hasSavedPhone && (
                  <div className="space-y-1.5">
                    <label htmlFor="cash-phone" className="block text-[11px] font-medium text-muted-foreground">
                      Tu WhatsApp (para que el vendedor te contacte)
                    </label>
                    <input
                      id="cash-phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="Ej. 55 1234 5678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-10 w-full rounded-xl border border-white/14 bg-black/40 px-3 text-sm text-white placeholder-white/30 focus:border-primary/50 focus:outline-none"
                    />
                  </div>
                )}
                {method === 'cash' && !hasSavedLocation && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label htmlFor="cash-state" className="block text-[11px] font-medium text-muted-foreground">
                        Estado
                      </label>
                      <select
                        id="cash-state"
                        value={stateName}
                        onChange={(e) => {
                          setStateName(e.target.value);
                          setCity('');
                        }}
                        className="h-10 w-full rounded-xl border border-white/14 bg-black/40 px-3 text-sm text-white focus:border-primary/50 focus:outline-none"
                      >
                        <option value="">Estado…</option>
                        {MEXICO_GEO.map((e) => (
                          <option key={e.estado} value={e.estado} className="bg-[#0c0c12]">
                            {e.estado}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="cash-city" className="block text-[11px] font-medium text-muted-foreground">
                        Ciudad
                      </label>
                      <select
                        id="cash-city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        disabled={!stateName}
                        className="h-10 w-full rounded-xl border border-white/14 bg-black/40 px-3 text-sm text-white focus:border-primary/50 focus:outline-none disabled:opacity-50"
                      >
                        <option value="">Ciudad…</option>
                        {cashCities.map((c) => (
                          <option key={c} value={c} className="bg-[#0c0c12]">
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {method === 'cash' && (
                  <p className="text-center text-[10px] text-muted-foreground">
                    Te asignamos un vendedor de tu zona.
                  </p>
                )}
              </div>
            )}
            <p className="text-sm text-neutral-300 font-medium text-center">¿Cuántas entradas deseas comprar?</p>
            <div className="flex items-center justify-center gap-6 py-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="size-11 rounded-full border-white/14 bg-white/[0.035] hover:bg-white/10 text-lg font-bold text-white"
              >
                -
              </Button>
              <span className="font-display text-3xl font-bold tabular-nums text-white w-8 text-center">
                {quantity}
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuantity(q => Math.min(maxQuantity, q + 1))}
                disabled={quantity >= maxQuantity}
                className="size-11 rounded-full border-white/14 bg-white/[0.035] hover:bg-white/10 text-lg font-bold text-white"
              >
                +
              </Button>
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              {alreadyOwned > 0
                ? `Ya tienes ${alreadyOwned} — puedes comprar ${maxQuantity} más`
                : `Límite de ${MAX_PER_ACCOUNT} pases por cuenta por evento`}
            </p>
            <Button
              type="button"
              disabled={
                method === 'cash' &&
                (phone.trim().length < 8 ||
                  stateName.trim() === '' ||
                  city.trim() === '')
              }
              onClick={() => (method === 'cash' ? setPickupOpen(true) : void createOrder())}
              className="w-full mt-2 h-11 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 font-semibold text-white shadow-[0_4px_18px_-4px_rgba(124,58,237,0.5)] transition-transform hover:brightness-110 active:scale-95 transform-gpu disabled:opacity-50 disabled:active:scale-100"
            >
              {method === 'cash'
                ? `Solicitar pago en efectivo (${formatMoney(displayTotalCents, summary.currency)})`
                : `Continuar al pago (${formatMoney(displayTotalCents, summary.currency)})`}
            </Button>
          </div>
        )}

        {phase === 'creating' && <PhaseLoader label="Preparando pago seguro…" />}

        {phase === 'paying' && clientSecret && stripeInit && (
          <Elements
            stripe={stripeInit.promise}
            options={{
              clientSecret,
              appearance: {
                theme: 'night',
                variables: {
                  colorPrimary: '#a855f7',
                  colorBackground: '#0f0f17',
                  colorText: '#ffffff',
                  colorDanger: '#f87171',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  borderRadius: '12px',
                },
              },
            }}
          >
            <PaymentForm
              orderId={orderId!}
              totalCents={summary.totalCents}
              currency={summary.currency}
              onProcessing={() => setPhase('processing')}
              onError={(message) => {
                setErrorMessage(message);
                toast.error(message);
              }}
            />
          </Elements>
        )}

        {phase === 'processing' && <PhaseLoader label="Procesando tu pase…" />}

        {phase === 'success' && (
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-300 np-success-pop transform-gpu">
              <Check className="size-7" />
            </div>
            <p className="text-sm text-muted-foreground np-fade-in" style={{ animationDelay: '180ms' }}>
              Redirigiendo a tu pase…
            </p>
          </div>
        )}

        {phase === 'cash_submitting' && <PhaseLoader label="Enviando tu solicitud…" />}

        {phase === 'cash_done' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-300 np-success-pop transform-gpu">
              <Check className="size-7" />
            </div>
            <div>
              <p className="font-display text-base font-semibold text-emerald-300">
                Solicitud enviada
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Un vendedor (RP) te contactará para cobrarte en efectivo. Tu pase
                aparecerá en “Mis pases” en cuanto confirme el pago.
              </p>
            </div>
            <Link
              href={paths.pases}
              className="mt-1 inline-flex h-11 items-center justify-center rounded-md bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-5 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(168,85,247,0.35)] transition hover:brightness-110 active:scale-95 transform-gpu"
            >
              Ver en Mis pases
            </Link>
          </div>
        )}

        {phase === 'no_stripe' && (
          <StateBlock
            tone="warn"
            title="Pagos no disponibles aún"
            message={
              errorMessage ??
              'Este local aún no completó la configuración de pagos. Vuelve más tarde.'
            }
            primary={{ label: 'Volver al evento', href: backToEvent }}
            secondary={{ label: 'Explorar otros locales', href: paths.appHome }}
          />
        )}

        {phase === 'duplicate' && (
          <StateBlock
            tone="info"
            title="Ya compraste todos tus pases"
            message={errorMessage ?? `Ya compraste el máximo de ${MAX_PER_ACCOUNT} pases para este evento con esta cuenta. No puedes comprar más.`}
            primary={
              duplicatePassId
                ? { label: 'Ver mi pase', href: `${paths.pases}/${duplicatePassId}` }
                : { label: 'Ver mis pases', href: paths.pases }
            }
          />
        )}

        {phase === 'sold_out' && (
          <StateBlock
            tone="warn"
            title="Pase agotado"
            message={errorMessage ?? 'Ya no quedan pases de este tipo.'}
            primary={{ label: 'Volver al evento', href: backToEvent }}
          />
        )}

        {phase === 'event_started' && (
          <StateBlock
            tone="warn"
            title="Evento iniciado"
            message={errorMessage ?? 'Este evento ya comenzó. Las ventas están cerradas.'}
            primary={{ label: 'Volver al inicio', href: paths.appHome }}
          />
        )}

        {phase === 'event_unavailable' && (
          <StateBlock
            tone="warn"
            title="Evento no disponible"
            message={errorMessage ?? 'Este evento no está publicado.'}
            primary={{ label: 'Volver al inicio', href: paths.appHome }}
          />
        )}

        {phase === 'free_tier' && (
          <StateBlock
            tone="info"
            title="Pase sin costo"
            message={errorMessage ?? 'Este tier es gratuito — no requiere pago.'}
            primary={{ label: 'Volver al evento', href: backToEvent }}
          />
        )}

        {phase === 'error' && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-red-300">{errorMessage ?? 'Algo salió mal.'}</p>
            <Button
              type="button"
              onClick={() => (method === 'cash' ? void requestCash() : void createOrder())}
              className="bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white shadow-[0_4px_24px_rgba(168,85,247,0.35)] transition hover:brightness-110 active:scale-95 transform-gpu"
            >
              Reintentar
            </Button>
          </div>
        )}
      </section>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="size-3" />
        Pago procesado de forma segura por Stripe.
      </p>

      <BulkChooseDialog
        item={bulkPromo}
        onClose={() => {
          // Cerró sin elegir (o tras elegir). En ambos casos continuamos al pase;
          // las promos sin elegir quedan visibles en Recompensas.
          setBulkPromo(null);
          if (pendingRedirect) {
            const target = pendingRedirect;
            setPendingRedirect(null);
            router.replace(target as never);
          }
        }}
      />

      <PickupModal
        open={pickupOpen}
        onOpenChange={setPickupOpen}
        tierId={tierId}
        fallbackCity={city}
        onConfirm={(sel) => {
          setPickup(sel);
          setPickupOpen(false);
          // Pasamos la selección explícita para no depender del state recién seteado.
          void requestCash(sel);
        }}
      />
    </div>
  );
}

interface PaymentFormProps {
  orderId: string;
  totalCents: number;
  currency: string;
  onProcessing: () => void;
  onError: (message: string) => void;
}

function PaymentForm({ orderId, totalCents, currency, onProcessing, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;

    setSubmitting(true);

    const returnUrl =
      window.location.origin +
      window.location.pathname +
      `?orderId=${encodeURIComponent(orderId)}`;

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    });

    if (result.error) {
      setSubmitting(false);
      const message = result.error.message ?? 'No se pudo confirmar el pago';
      onError(message);
      return;
    }

    const status = result.paymentIntent?.status;
    if (status === 'succeeded' || status === 'processing' || status === 'requires_capture') {
      onProcessing();
      return;
    }

    setSubmitting(false);
    onError(`Estado de pago inesperado: ${status ?? 'desconocido'}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement options={{ layout: 'tabs' }} />
      <Button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className={`h-12 w-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-base font-semibold text-white shadow-[0_4px_24px_rgba(168,85,247,0.35)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 transform-gpu ${!stripe || !elements || submitting ? '' : 'np-shimmer'}`}
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Procesando…
          </>
        ) : (
          <>
            <Lock className="size-4" />
            Pagar {formatMoney(totalCents, currency)}
          </>
        )}
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        Al confirmar aceptas los términos del local y la política de NightPass.
      </p>
    </form>
  );
}

function PhaseLoader({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 text-center np-fade-in">
      <Loader2 className="size-6 animate-spin text-primary transform-gpu" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

interface StateBlockProps {
  tone: 'info' | 'warn';
  title: string;
  message: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}

function StateBlock({ tone, title, message, primary, secondary }: StateBlockProps) {
  const titleColor = tone === 'warn' ? 'text-amber-300' : 'text-primary';
  return (
    <div className="space-y-4 text-center">
      <div>
        <p className={`font-display text-base font-semibold ${titleColor}`}>{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Link
          href={primary.href}
          className="inline-flex h-11 items-center justify-center rounded-md bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-5 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(168,85,247,0.35)] transition hover:brightness-110 active:scale-95 transform-gpu"
        >
          {primary.label}
        </Link>
        {secondary && (
          <Link
            href={secondary.href}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {secondary.label}
          </Link>
        )}
      </div>
    </div>
  );
}
