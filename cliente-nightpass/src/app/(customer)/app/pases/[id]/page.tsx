import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Check, MapPin, Ticket } from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { Pass } from '@/core/types/api';
import { PassQR } from '../../../_components/pass-qr';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const pass = await serverFetch<Pass>(`/passes/${id}`);
    const title = pass.event?.title ?? 'Mi pase';
    return { title: `${title} — NightPass` };
  } catch {
    return { title: 'Mi pase — NightPass' };
  }
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default async function PassDetailPage({ params }: Props) {
  const { id } = await params;

  let pass: Pass;
  try {
    pass = await serverFetch<Pass>(`/passes/${id}`);
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }

  const used = Boolean(pass.usedAt);
  const event = pass.event;
  const venue = event?.venue;

  return (
    <div className="mx-auto w-full max-w-md px-5 py-6 sm:px-8 sm:py-10">
      <Link
        href={paths.pases}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Mis pases
      </Link>

      <section className="mt-6 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-xl">
        {/* Top: status pill */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5 sm:px-6">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            <Ticket className="size-3.5" />
            Pase NightPass
          </p>
          {used ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
              <Check className="size-3" />
              Usado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Activo
            </span>
          )}
        </div>

        {/* QR */}
        <div className="px-5 pb-2 pt-7 sm:px-6 sm:pt-9">
          <PassQR value={pass.qrCode} usedAt={pass.usedAt} />

          {used && pass.usedAt && (
            <p className="mt-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-red-300/90">
              Usado el {formatShortDate(pass.usedAt)}
            </p>
          )}
          {!used && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Muestra este QR en la puerta del local.
            </p>
          )}
        </div>

        {/* Perforated divider */}
        <div className="relative my-2">
          <div className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-background" />
          <div className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-background" />
          <div className="mx-6 border-t border-dashed border-white/15" />
        </div>

        {/* Event info */}
        <div className="space-y-3 px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              {event?.title ?? 'Evento'}
            </h1>
            {pass.tier && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {pass.tier.name}
              </p>
            )}
          </div>

          {event?.startsAt && (
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
          )}

          {venue && (
            <div className="flex items-start gap-3 rounded-[16px] border border-white/8 bg-white/[0.02] p-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Local
                </p>
                <p className="mt-0.5 text-sm font-medium text-foreground">{venue.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[venue.city, venue.address].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/8 px-5 py-3 sm:px-6">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Pase ID
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-white/55">{pass.id}</p>
        </div>
      </section>

      <p className="mt-5 text-center text-[11px] text-muted-foreground">
        El QR es único y de un solo uso. No lo compartas con nadie.
      </p>
    </div>
  );
}
