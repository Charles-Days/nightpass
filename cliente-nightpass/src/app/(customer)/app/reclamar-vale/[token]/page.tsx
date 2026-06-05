import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Gift, LogIn, MapPin } from 'lucide-react';
import { ServerApiError, publicFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import { ACCESS_COOKIE } from '@/core/config/cookies';
import type { PassClaimPreview } from '@/core/types/api';
import { ClaimAccept } from '../../../_components/claim-accept';

interface Props {
  params: Promise<{ token: string }>;
}

export const metadata = {
  title: 'Reclamar boleto — NightPass',
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

const money = (cents: number, currency: string) =>
  `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;

/** Motivo por el que NO se puede reclamar (+ nota explicativa cuando aplica). */
function blockReason(
  p: PassClaimPreview,
): { title: string; note?: string } | null {
  if (p.status === 'CLAIMED')
    return {
      title: 'Este boleto ya fue reclamado.',
      note: 'Este link es de un solo uso y alguien lo tomó antes. Cada boleto solo se puede reclamar una vez.',
    };
  if (p.status === 'CANCELLED')
    return { title: 'Esta cortesía fue cancelada.' };
  if (p.status === 'EXPIRED' || p.expired)
    return {
      title: 'Este boleto expiró.',
      note: 'El link caducó. Pídele al organizador que genere uno nuevo.',
    };
  if (p.alreadyHasPass)
    return { title: 'Ya tienes un pase para este evento.' };
  return null;
}

export default async function ReclamarValePage({ params }: Props) {
  const { token } = await params;

  // Preview PÚBLICO: no requiere sesión (cualquiera con el link lo ve).
  let preview: PassClaimPreview;
  try {
    preview = await publicFetch<PassClaimPreview>(
      `/passes/claims/${token}`,
      { revalidate: 0 },
    );
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }

  // ¿Hay sesión? El "reclamar" sí requiere login; el preview no.
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get(ACCESS_COOKIE)?.value);

  const blocked = blockReason(preview);
  const event = preview.event;
  const venue = event.venue;
  const venueName = venue?.name ?? event.externalVenueName ?? null;
  const venueLocation = venue
    ? [venue.city, venue.address].filter(Boolean).join(' · ')
    : (event.externalVenueCity ?? null);
  const loginHref =
    `${paths.iniciarSesion}?from=${encodeURIComponent(
      `${paths.reclamarVale}/${token}`,
    )}` as const;

  return (
    <div className="mx-auto w-full max-w-md px-5 py-6 sm:px-8 sm:py-10">
      <Link
        href={paths.pases}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground active:scale-95 transform-gpu"
      >
        <ArrowLeft className="size-4" />
        Mis pases
      </Link>

      <section className="mt-6 overflow-hidden rounded-[24px] border border-white/14 bg-gradient-to-br from-white/[0.04] via-white/[0.025] to-primary/[0.04] backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-white/12 px-5 py-3.5 sm:px-6">
          <p className="flex items-center gap-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            <Gift className="size-3.5" />
            Te regalaron un boleto
          </p>
        </div>

        <div className="space-y-3 px-5 py-5 sm:px-6 sm:py-6">
          <h1 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            {event.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            {preview.tier && (
              <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {preview.tier.name}
              </p>
            )}
            {preview.isFree ? (
              <p className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                Cortesía · Gratis
              </p>
            ) : (
              <p className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/[0.07] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                {money(preview.amountCents, preview.currency)}
              </p>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-[16px] border border-white/12 bg-white/[0.035] p-3">
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

          {venueName && (
            <div className="flex items-start gap-3 rounded-[16px] border border-white/12 bg-white/[0.035] p-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Local
                </p>
                <p className="mt-0.5 text-sm font-medium text-foreground">
                  {venueName}
                </p>
                {venueLocation && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {venueLocation}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/12 px-5 py-5 sm:px-6">
          {blocked ? (
            <div className="rounded-xl border border-white/14 bg-white/[0.05] px-4 py-3 text-center">
              <p className="text-sm font-medium text-white/80">
                {blocked.title}
              </p>
              {blocked.note && (
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {blocked.note}
                </p>
              )}
            </div>
          ) : isLoggedIn ? (
            <ClaimAccept token={token} />
          ) : (
            <div className="space-y-3">
              <Link
                href={loginHref as never}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] py-4 text-base font-semibold text-white transition hover:opacity-90 active:scale-[0.98] transform-gpu"
              >
                <LogIn className="size-5" />
                Inicia sesión para reclamar
              </Link>
              <p className="text-center text-xs text-muted-foreground">
                Después de entrar volverás aquí para reclamarlo. ¿No tienes
                cuenta?{' '}
                <Link
                  href={
                    `${paths.registro}?from=${encodeURIComponent(
                      `${paths.reclamarVale}/${token}`,
                    )}` as never
                  }
                  className="font-semibold text-primary hover:underline"
                >
                  Crear una
                </Link>
              </p>
            </div>
          )}
        </div>
      </section>

      <p className="mt-5 text-center text-[11px] text-muted-foreground">
        Este link es de un solo uso. El primero que lo reclame se queda con el
        boleto.
      </p>
    </div>
  );
}
