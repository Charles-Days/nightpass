'use client';

import * as React from 'react';
import { loadStripe, type Stripe as StripeJs } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { Loader2, Wallet, Plus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/core/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { Input } from '@/core/components/ui/input';
import { ClientApiError } from '@/core/lib/api/client-client';
import {
  useCashWallet,
  useCashWalletTopup,
  useRefetchCashWallet,
  type TopupResponse,
  type WalletOwner,
  type CashWalletTxType,
} from '../hooks/use-cash-wallet';

// Recargas rápidas sugeridas (en centavos): $200, $500, $1,000 MXN.
const PRESETS = [20000, 50000, 100000];

const stripeCache = new Map<string, Promise<StripeJs | null>>();
function getStripePromise(key?: string): Promise<StripeJs | null> | null {
  const k = key || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  if (!k) return null;
  const cached = stripeCache.get(k);
  if (cached) return cached;
  const p = loadStripe(k);
  stripeCache.set(k, p);
  return p;
}

function money(cents: number, currency = 'MXN'): string {
  return `$${(cents / 100).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency.toUpperCase()}`;
}

const TX_LABEL: Record<CashWalletTxType, string> = {
  TOPUP: 'Recarga',
  CASH_FEE_DEBIT: 'Comisión efectivo',
  ADJUSTMENT: 'Ajuste',
  REVERSAL: 'Reverso',
};

export function CashWalletCard({
  owner,
  title = 'Saldo para ventas en efectivo',
}: {
  owner: WalletOwner;
  title?: string;
}) {
  const { data, isLoading } = useCashWallet(owner);
  const topup = useCashWalletTopup(owner);
  const refetch = useRefetchCashWallet(owner);

  const [selected, setSelected] = React.useState<number>(PRESETS[0]);
  const [custom, setCustom] = React.useState('');
  const [session, setSession] = React.useState<TopupResponse | null>(null);

  const customCents =
    custom.trim() === '' ? null : Math.round(Number(custom) * 100);
  const amountCents =
    customCents != null && Number.isFinite(customCents) && customCents > 0
      ? customCents
      : selected;

  const startTopup = () => {
    if (amountCents < 5000) {
      toast.error('La recarga mínima es de $50 MXN');
      return;
    }
    topup.mutate(amountCents, {
      onSuccess: (res) => setSession(res),
      onError: (err) => {
        const msg =
          err instanceof ClientApiError &&
          err.payload &&
          typeof err.payload === 'object' &&
          'message' in err.payload
            ? String((err.payload as { message: unknown }).message)
            : 'No pudimos iniciar la recarga';
        toast.error(msg);
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Exento: el admin no cobra comisión en efectivo → no se necesita saldo.
  if (data?.cashCommissionExempt) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Estás <strong className="text-foreground">exento</strong> de comisión en
          ventas en efectivo. No necesitas saldo: tus vendedores pueden confirmar
          pases en efectivo sin costo.
        </CardContent>
      </Card>
    );
  }

  const balance = data?.balanceCents ?? 0;
  const currency = data?.currency ?? 'MXN';
  const feePct = data?.effectiveFeePct ?? 0;
  const lowBalance = balance < 5000;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="size-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Saldo disponible
          </p>
          <p
            className={`mt-1 font-display text-3xl font-bold ${
              lowBalance ? 'text-amber-400' : 'text-foreground'
            }`}
          >
            {money(balance, currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Se descuenta <strong>{feePct}%</strong> del precio por cada pase
            vendido en efectivo. Sin saldo, tus vendedores no podrán confirmar
            pagos en efectivo.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recargar saldo
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={
                  customCents == null && selected === c ? 'default' : 'outline'
                }
                onClick={() => {
                  setSelected(c);
                  setCustom('');
                }}
              >
                {money(c, currency).replace('.00', '')}
              </Button>
            ))}
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">$</span>
              <Input
                type="number"
                min="50"
                step="50"
                placeholder="Otro"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="h-9 w-24"
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={startTopup}
            disabled={topup.isPending}
            className="mt-1"
          >
            {topup.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Recargar {money(amountCents, currency).replace('.00', '')}
          </Button>
        </div>

        {data && data.transactions.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Movimientos recientes
            </p>
            <ul className="divide-y divide-white/10 rounded-lg border border-white/14">
              {data.transactions.slice(0, 8).map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">
                      {t.note || TX_LABEL[t.type]}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString('es-MX', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold ${
                      t.amountCents >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {t.amountCents >= 0 ? '+' : '−'}
                    {money(Math.abs(t.amountCents), t.currency).replace(
                      '.00',
                      '',
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>

      <TopupDialog
        session={session}
        onClose={() => setSession(null)}
        onDone={() => {
          setSession(null);
          // El webhook acredita en ~1-3s; refrescamos un par de veces.
          setTimeout(refetch, 1500);
          setTimeout(refetch, 5000);
        }}
      />
    </Card>
  );
}

function TopupDialog({
  session,
  onClose,
  onDone,
}: {
  session: TopupResponse | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const stripePromise = session ? getStripePromise(session.publishableKey) : null;

  return (
    <Dialog
      open={session != null}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Recargar {session ? money(session.amountCents, session.currency).replace('.00', '') : ''}
          </DialogTitle>
        </DialogHeader>
        {session && stripePromise ? (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret: session.clientSecret }}
          >
            <TopupForm
              amountCents={session.amountCents}
              currency={session.currency}
              onDone={onDone}
            />
          </Elements>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pagos no configurados en este servidor.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TopupForm({
  amountCents,
  currency,
  onDone,
}: {
  amountCents: number;
  currency: string;
  onDone: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (result.error) {
      toast.error(result.error.message || 'No se pudo procesar el pago');
      setSubmitting(false);
      return;
    }
    const status = result.paymentIntent?.status;
    if (
      status === 'succeeded' ||
      status === 'processing' ||
      status === 'requires_capture'
    ) {
      toast.success('Recarga enviada — tu saldo se acreditará en unos segundos');
      onDone();
      return;
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      <Button type="submit" disabled={!stripe || !elements || submitting} className="w-full">
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Pagar {money(amountCents, currency).replace('.00', '')}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        Pago seguro procesado por Stripe.
      </p>
    </form>
  );
}
