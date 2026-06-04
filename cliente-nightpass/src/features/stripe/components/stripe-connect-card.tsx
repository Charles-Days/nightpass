'use client';

import { CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/components/ui/card';
import { useStripeStatus } from '../hooks/use-stripe-status';
import { useOnboardStripe } from '../hooks/use-onboard-stripe';
import { useStripeStatusPromoter } from '../hooks/use-stripe-status-promoter';
import { useOnboardStripePromoter } from '../hooks/use-onboard-stripe-promoter';

type Mode = 'venue' | 'promoter';

interface BaseProps {
  mode?: Mode;
}

interface VenueProps extends BaseProps {
  mode?: 'venue';
  venueId: string;
  venueName: string;
}

interface PromoterProps extends BaseProps {
  mode: 'promoter';
  /** Nombre opcional para mostrar como título — default "Tu organizador". */
  title?: string;
}

export type StripeConnectCardProps = VenueProps | PromoterProps;

export function StripeConnectCard(props: StripeConnectCardProps) {
  if (props.mode === 'promoter') {
    return <PromoterCard title={props.title ?? 'Cuenta Stripe del organizador'} />;
  }
  return <VenueCard venueId={props.venueId} venueName={props.venueName} />;
}

// ─── Venue variant ───────────────────────────────────────────────────────────

function VenueCard({ venueId, venueName }: { venueId: string; venueName: string }) {
  const status = useStripeStatus(venueId);
  const onboard = useOnboardStripe();

  const handleOnboard = async () => {
    try {
      const { url } = await onboard.mutateAsync({ venueId });
      window.location.href = url;
    } catch (err) {
      toast.error('No se pudo iniciar el onboarding de Stripe');
      console.error(err);
    }
  };

  const ready =
    status.data?.chargesEnabled === true && status.data.detailsSubmitted === true;
  const hasAccount = !!status.data?.accountId;

  return (
    <Card className="rounded-[22px] border border-white/14 bg-white/[0.05]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{venueName}</CardTitle>
          <StatusBadge ready={ready} hasAccount={hasAccount} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.isLoading ? (
          <p className="text-sm text-muted-foreground">Consultando estado…</p>
        ) : null}

        {status.error ? (
          <p className="text-sm text-amber-300">
            No se pudo consultar el estado: {(status.error as Error).message}
          </p>
        ) : null}

        {!ready ? (
          <>
            <p className="text-sm text-muted-foreground">
              {hasAccount
                ? 'Stripe necesita más información para activar los cobros.'
                : 'Conecta una cuenta de Stripe Connect para empezar a cobrar tickets.'}
            </p>
            <Button
              onClick={handleOnboard}
              disabled={onboard.isPending}
              className="bg-gradient-to-r from-[#9333ea] to-[#a855f7] shadow-[0_4px_24px_rgba(168,85,247,0.35)]"
            >
              {onboard.isPending
                ? 'Abriendo…'
                : hasAccount
                  ? 'Continuar onboarding'
                  : 'Conectar Stripe'}
              <ExternalLink className="ml-2 size-4" />
            </Button>
          </>
        ) : (
          <div className="space-y-1.5">
            <p className="text-sm text-emerald-300">
              Pagos activos. Los clientes pueden comprar pases a este local.
            </p>
            {status.data?.accountId ? (
              <p className="font-mono text-xs text-muted-foreground">
                {status.data.accountId}
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Promoter variant ────────────────────────────────────────────────────────

function PromoterCard({ title }: { title: string }) {
  const status = useStripeStatusPromoter();
  const onboard = useOnboardStripePromoter();

  const handleOnboard = async () => {
    try {
      const { url } = await onboard.mutateAsync();
      window.location.href = url;
    } catch (err) {
      toast.error('No se pudo iniciar el onboarding de Stripe');
      console.error(err);
    }
  };

  const ready =
    status.data?.chargesEnabled === true && status.data.detailsSubmitted === true;
  const hasAccount = !!status.data?.connected;

  return (
    <Card className="rounded-[22px] border border-white/14 bg-white/[0.05]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <StatusBadge ready={ready} hasAccount={hasAccount} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.isLoading ? (
          <p className="text-sm text-muted-foreground">Consultando estado…</p>
        ) : null}

        {status.error ? (
          <p className="text-sm text-amber-300">
            No se pudo consultar el estado: {(status.error as Error).message}
          </p>
        ) : null}

        {!ready ? (
          <>
            <p className="text-sm text-muted-foreground">
              {hasAccount
                ? 'Stripe necesita más información para activar los cobros de tu organizador.'
                : 'Conecta una cuenta de Stripe Express para empezar a cobrar pases de tus eventos.'}
            </p>
            <Button
              onClick={handleOnboard}
              disabled={onboard.isPending}
              className="bg-gradient-to-r from-[#9333ea] to-[#a855f7] shadow-[0_4px_24px_rgba(168,85,247,0.35)]"
            >
              {onboard.isPending
                ? 'Abriendo…'
                : hasAccount
                  ? 'Continuar onboarding'
                  : 'Conectar Stripe'}
              <ExternalLink className="ml-2 size-4" />
            </Button>
          </>
        ) : (
          <div className="space-y-1.5">
            <p className="text-sm text-emerald-300">
              Pagos activos. Ya puedes cobrar pases de tus eventos.
            </p>
            {status.data?.stripeAccountId ? (
              <p className="font-mono text-xs text-muted-foreground">
                {status.data.stripeAccountId}
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({
  ready,
  hasAccount,
}: {
  ready: boolean;
  hasAccount: boolean;
}) {
  if (ready) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
        <CheckCircle2 className="size-3.5" /> Activo
      </span>
    );
  }
  if (hasAccount) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-200">
        <AlertTriangle className="size-3.5" /> En proceso
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/70">
      No conectado
    </span>
  );
}
