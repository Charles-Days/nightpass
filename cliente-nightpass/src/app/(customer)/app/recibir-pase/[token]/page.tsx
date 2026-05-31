import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Gift, MapPin } from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { PassTransferPreview } from '@/core/types/api';
import { TransferAccept } from '../../../_components/transfer-accept';

interface Props {
  params: Promise<{ token: string }>;
}

export const metadata = {
  title: 'Recibir pase — NightPass',
  robots: { index: false },
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function blockReason(t: PassTransferPreview): string | null {
  if (t.status === 'CLAIMED') return 'Esta transferencia ya fue aceptada.';
  if (t.status === 'CANCELLED')
    return 'El dueño canceló esta transferencia.';
  if (t.status === 'EXPIRED' || t.expired)
    return 'Esta transferencia expiró.';
  if (t.alreadyUsed) return 'El pase ya fue usado.';
  if (t.isOwnPass) return 'Este es tu propio pase — no puedes recibirlo.';
  return null;
}

export default async function RecibirPasePage({ params }: Props) {
  const { token } = await params;

  let preview: PassTransferPreview;
  try {
    preview = await serverFetch<PassTransferPreview>(
      `/passes/transfers/${token}`,
    );
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }

  const blocked = blockReason(preview);
  const event = preview.event;
  const venue = event.venue;

  return (
    <div className="mx-auto w-full max-w-md px-5 py-6 sm:px-8 sm:py-10">
      <Link
        href={paths.pases}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground active:scale-95 transform-gpu"
      >
        <ArrowLeft className="size-4" />
        Mis pases
      </Link>

      <section className="mt-6 overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-white/[0.04] via-white/[0.025] to-primary/[0.04] backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-white/8 px-5 py-3.5 sm:px-6">
          <p className="flex items-center gap-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            <Gift className="size-3.5" />
            Te transfieren un pase
          </p>
        </div>

        <div className="space-y-3 px-5 py-5 sm:px-6 sm:py-6">
          {preview.fromName && (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {preview.fromName}
              </span>{' '}
              te cede su pase para:
            </p>
          )}

          <h1 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            {event.title}
          </h1>
          {preview.tier && (
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {preview.tier.name}
            </p>
          )}

          <div className="flex items-start gap-3 rounded-[16px] border border-white/8 bg-white/[0.02] p-3">
            <Calendar className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Fecha
              </p>
              <p className="mt-0.5 text-sm font-medium capitalize text-foreground">
                {formatDate(event.startsAt)}
              </p>
            </div>
          </div>

          {venue && (
            <div className="flex items-start gap-3 rounded-[16px] border border-white/8 bg-white/[0.02] p-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Local
                </p>
                <p className="mt-0.5 text-sm font-medium text-foreground">
                  {venue.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[venue.city, venue.address].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/8 px-5 py-5 sm:px-6">
          {blocked ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm text-white/70">
              {blocked}
            </p>
          ) : (
            <TransferAccept token={token} />
          )}
        </div>
      </section>

      <p className="mt-5 text-center text-[11px] text-muted-foreground">
        Al aceptar, el pase queda a tu nombre y el QR del remitente deja de
        funcionar.
      </p>
    </div>
  );
}
