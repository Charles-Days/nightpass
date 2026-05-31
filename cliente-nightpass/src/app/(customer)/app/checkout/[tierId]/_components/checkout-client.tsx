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

type Phase =
  | 'select_quantity'
  | 'creating'
  | 'paying'
  | 'processing'
  | 'success'
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

  // Cuántos pases más puede comprar antes de tocar el límite por cuenta.
  const maxQuantity = Math.max(0, MAX_PER_ACCOUNT - alreadyOwned);
  const limitReached = !!initialTier && maxQuantity <= 0;

  const [phase, setPhase] = useState<Phase>(
    initialTier && initialTier.paymentsEnabled === false
      ? 'no_stripe'
      : limitReached
        ? 'duplicate'
        : 'select_quantity',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialTier && initialTier.paymentsEnabled === false
      ? 'Este local aún no completó la configuración de pagos. Vuelve más tarde.'
      : limitReached
        ? `Ya compraste el máximo de ${MAX_PER_ACCOUNT} pases para este evento con esta cuenta. No puedes comprar más.`
        : null,
  );
  const [duplicatePassId, setDuplicatePassId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(existingOrderId);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [stripeInit, setStripeInit] = useState<StripeInitState | null>(null);
  const [manualRpCode, setManualRpCode] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

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
        body: { tierId, referralCode: resolvedCode, quantity: currentQty },
      });

      if (resolvedCode) {
        setAppliedCode(resolvedCode);
      }

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
  }, [initialTier, tierId, quantity]);

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
            router.replace(target);
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

      <section className="mt-6 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025] p-5 np-rise" style={{ animationDelay: '120ms' }}>
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
            {formatMoney(summary.totalCents, summary.currency)}
          </span>
        </div>

        <div className="my-4 h-px bg-white/8" />

        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-semibold">Total</span>
          <span className="font-display text-2xl font-bold tabular-nums text-primary">
            {formatMoney(summary.totalCents, summary.currency)}
          </span>
        </div>

        {/* Código de RP */}
        <div className="mt-4 border-t border-white/5 pt-4">
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
                className="h-9 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-white placeholder-white/30 focus:border-primary/50 focus:outline-none"
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
        className={`mt-5 rounded-[22px] border border-white/10 bg-white/[0.025] p-5 transform-gpu ${isErrorPhase ? 'np-shake border-red-400/20' : 'np-rise'}`}
        style={{ animationDelay: '180ms' }}
      >
        {phase === 'select_quantity' && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-neutral-300 font-medium text-center">¿Cuántas entradas deseas comprar?</p>
            <div className="flex items-center justify-center gap-6 py-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="size-11 rounded-full border-white/10 bg-white/[0.02] hover:bg-white/10 text-lg font-bold text-white"
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
                className="size-11 rounded-full border-white/10 bg-white/[0.02] hover:bg-white/10 text-lg font-bold text-white"
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
              onClick={() => void createOrder()}
              className="w-full mt-2 h-11 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 font-semibold text-white shadow-[0_4px_18px_-4px_rgba(124,58,237,0.5)] transition-transform hover:brightness-110 active:scale-95 transform-gpu"
            >
              Continuar al pago ({formatMoney(summary.totalCents, summary.currency)})
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
              onClick={() => void createOrder()}
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
