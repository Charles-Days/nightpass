import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { CatalogEventDetail } from '@/core/types/api';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const ev = await serverFetch<CatalogEventDetail>(`/catalog/events/${id}`);
    return { title: `${ev.title} — NightPass`, description: ev.description ?? undefined };
  } catch {
    return { title: 'Evento — NightPass' };
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

function formatPrice(cents: number, currency: string) {
  const sym = currency.toLowerCase() === 'mxn' ? '$' : currency.toLowerCase() === 'eur' ? '€' : '$';
  return `${sym}${(cents / 100).toFixed(0)}${currency.toLowerCase() === 'mxn' ? ' MXN' : ''}`;
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  let event: CatalogEventDetail;
  try {
    event = await serverFetch<CatalogEventDetail>(`/catalog/events/${id}`);
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8 sm:py-10">
      <Link
        href={`${paths.bar}/${event.venue.slug}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {event.venue.name}
      </Link>

      <section className="mt-5 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025]">
        <div className="relative aspect-[16/9] bg-gradient-to-br from-purple-900/40 to-purple-600/10">
          {event.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.coverImageUrl}
              alt={event.title}
              className="absolute inset-0 size-full object-cover"
            />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              <Calendar className="mr-1 inline size-3" />
              {formatDate(event.startsAt)}
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              {event.title}
            </h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/75">
              <MapPin className="size-3.5" />
              {event.venue.name} · {event.venue.city}
            </p>
          </div>
        </div>

        {event.description && (
          <div className="border-t border-white/8 p-5 sm:p-7">
            <p className="text-sm leading-relaxed text-muted-foreground">{event.description}</p>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-4 font-display text-xl font-bold tracking-tight">Boletos</h2>
        {event.tiers.length === 0 ? (
          <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-8 text-center text-sm text-muted-foreground">
            Aún no hay tiers disponibles.
          </div>
        ) : (
          <ul className="space-y-3">
            {event.tiers.map((tier) => (
              <li
                key={tier.id}
                className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-white/[0.025] p-4 sm:p-5"
              >
                <div>
                  <p className="font-display text-base font-bold tracking-tight">{tier.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {tier.capacity ? `${tier.capacity} lugares` : 'Sin límite'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg font-bold tabular-nums">
                    {formatPrice(tier.priceCents, tier.currency)}
                  </span>
                  <Link
                    href={`${paths.checkout}/${tier.id}`}
                    className="rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)] transition hover:brightness-110"
                  >
                    Comprar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
