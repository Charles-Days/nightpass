import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Gift, LogIn, MapPin } from 'lucide-react';
import { ServerApiError, publicFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import { ACCESS_COOKIE } from '@/core/config/cookies';
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

/** Motivo por el que NO se puede aceptar (+ nota explicativa cuando aplica). */
function blockReason(
  t: PassTransferPreview,
): { title: string; note?: string } | null {
  if (t.status === 'CLAIMED')
    return {
      title: 'Esta transferencia ya fue aceptada.',
      note: 'Lo más probable es que el link se compartió con varias personas y alguien lo canjeó antes. Cada pase solo se puede reclamar una vez.',
    };
  if (t.status === 'CANCELLED')
    return { title: 'El dueño canceló esta transferencia.' };
  if (t.status === 'EXPIRED' || t.expired)
    return {
      title: 'Esta transferencia expiró.',
      note: 'El link caducó. Pídele al dueño del pase que genere uno nuevo.',
    };
  if (t.alreadyUsed) return { title: 'El pase ya fue usado.' };
  if (t.isOwnPass)
    return { title: 'Este es tu propio pase — no puedes recibirlo.' };
  return null;
}

export default async function RecibirPasePage({ params }: Props) {
  const { token } = await params;

  // Preview PÚBLICO: no requiere sesión (cualquiera con el link lo ve).
  let preview: PassTransferPreview;
  try {
    preview = await publicFetch<PassTransferPreview>(
      `/passes/transfers/${token}`,
      { revalidate: 0 },
    );
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }

  // ¿Hay sesión? El "aceptar" sí requiere login; el preview no.
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get(ACCESS_COOKIE)?.value);

  const blocked = blockReason(preview);
  const event = preview.event;
  const venue = event.venue;
  const loginHref =
    `${paths.iniciarSesion}?from=${encodeURIComponent(
      `${paths.recibirPase}/${token}`,
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

          {venue && (
            <div className="flex items-start gap-3 rounded-[16px] border border-white/12 bg-white/[0.035] p-3">
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
            <TransferAccept token={token} />
          ) : (
            <div className="space-y-3">
              <Link
                href={loginHref as never}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] py-4 text-base font-semibold text-white transition hover:opacity-90 active:scale-[0.98] transform-gpu"
              >
                <LogIn className="size-5" />
                Inicia sesión para reclamar tu pase
              </Link>
              <p className="text-center text-xs text-muted-foreground">
                Después de entrar volverás aquí para aceptarlo. ¿No tienes
                cuenta?{' '}
                <Link
                  href={
                    `${paths.registro}?from=${encodeURIComponent(
                      `${paths.recibirPase}/${token}`,
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
        Al aceptar, el pase queda a tu nombre y el QR del remitente deja de
        funcionar. El primero que lo acepte se queda con el pase.
      </p>
    </div>
  );
}
