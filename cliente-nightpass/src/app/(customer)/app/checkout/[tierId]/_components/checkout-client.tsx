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
import { ArrowLeft, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/core/components/ui/button';
import { clientFetch, ClientApiError } from '@/core/lib/api/client-client';
import { paths } from '@/core/config/paths';
import type { Order, OrderCreationResponse } from '@/core/types/api';

type Phase = 'creating' | 'paying' | 'processing' | 'success' | 'error' | 'duplicate';

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

function extractApiErrorMessage(error: unknown): string {
  if (error instanceof ClientApiError) {
    const payload = error.payload as { message?: string | string[] } | null;
    if (payload?.message) {
      return Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
    }
    return `Error ${error.status}`;
  }
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado';
}

interface CheckoutClientProps {
  tierId: string;
}

export function CheckoutClient({ tierId }: CheckoutClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingOrderId = searchParams.get('orderId');

  const [phase, setPhase] = useState<Phase>('creating');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(existingOrderId);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [stripeInit, setStripeInit] = useState<StripeInitState | null>(null);

  const initRef = useRef(false);

  const createOrder = useCallback(async () => {
    setPhase('creating');
    setErrorMessage(null);
    try {
      const res = await clientFetch<OrderCreationResponse>('/api/orders', {
        method: 'POST',
        body: { tierId },
      });

      const stripeState = getStripePromise(res.publishableKey);
      if (!stripeState) {
        setPhase('error');
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
          eventId: '',
          tierId,
          status: 'PENDING',
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
      if (error instanceof ClientApiError && error.status === 409) {
        setPhase('duplicate');
        setErrorMessage(extractApiErrorMessage(error));
        return;
      }
      const message = extractApiErrorMessage(error);
      setErrorMessage(message);
      setPhase('error');
      toast.error(message);
    }
  }, [tierId]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    if (existingOrderId) {
      setOrderId(existingOrderId);
      setPhase('processing');
      return;
    }

    void createOrder();
  }, [createOrder, existingOrderId]);

  useEffect(() => {
    if (phase !== 'processing' || !orderId) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async () => {
      while (!cancelled && attempts < maxAttempts) {
        attempts += 1;
        try {
          const fresh = await clientFetch<Order>(`/api/orders/${orderId}`);
          if (cancelled) return;
          setOrder(fresh);

          if (fresh.status === 'COMPLETED' && fresh.pass?.id) {
            setPhase('success');
            router.replace(`${paths.pases}/${fresh.pass.id}`);
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
    return {
      title: event?.title ?? 'Evento',
      venueName: event?.venue?.name,
      city: event?.venue?.city,
      startsAt: event?.startsAt,
      tierName: tier?.name ?? 'Pase',
      totalCents: order?.totalCents ?? tier?.priceCents ?? 0,
      currency: order?.currency ?? tier?.currency ?? 'MXN',
    };
  }, [order]);

  return (
    <div className="mx-auto w-full max-w-md px-5 py-6 sm:py-10">
      <Link
        href={paths.appHome}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>

      <header className="mt-5">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Checkout
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">Confirma tu pase</h1>
      </header>

      <section className="mt-6 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025] p-5">
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
          <span className="text-sm text-muted-foreground">{summary.tierName}</span>
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
      </section>

      <section className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.025] p-5">
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

        {phase === 'success' && <PhaseLoader label="Redirigiendo a tu pase…" />}

        {phase === 'duplicate' && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              {errorMessage ?? 'Ya tienes un pase para este evento.'}
            </p>
            <Link
              href={paths.pases}
              className="inline-flex h-10 items-center justify-center rounded-md bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-5 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(168,85,247,0.35)] transition hover:brightness-110"
            >
              Ver mis pases
            </Link>
          </div>
        )}

        {phase === 'error' && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-red-300">{errorMessage ?? 'Algo salió mal.'}</p>
            <Button
              type="button"
              onClick={() => void createOrder()}
              className="bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white shadow-[0_4px_24px_rgba(168,85,247,0.35)] hover:brightness-110"
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
        className="h-11 w-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-sm font-semibold text-white shadow-[0_4px_24px_rgba(168,85,247,0.35)] transition hover:brightness-110 disabled:opacity-70"
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
    <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
