import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Lock, MapPin, Navigation, TrendingUp, Users } from 'lucide-react';
import { ServerApiError, publicFetch, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import { absoluteUrl } from '@/core/config/env';
import { JsonLd, eventLd, breadcrumbLd } from '@/core/seo/json-ld';
import {
  LOYALTY_TIER_RANK,
  type CatalogEventDetail,
  type LoyaltyStatus,
  type LoyaltyTier,
} from '@/core/types/api';
import { TIER_STYLES } from '@/features/loyalty';
import { EventStoriesSection } from '@/app/(customer)/_components/event-stories-section';
import { EventForumSection } from '@/app/(customer)/_components/event-forum-section';
import { EventAforo } from '@/app/(customer)/_components/event-aforo';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const ev = await publicFetch<CatalogEventDetail>(`/catalog/events/${id}`, {
      revalidate: 300,
      tags: [`event:${id}`],
    });
    const title = `${ev.title} — NightPass`;
    const description = ev.description ?? undefined;
    const path = `${paths.evento}/${id}`;
    return {
      title,
      description,
      alternates: { canonical: path },
      openGraph: { title, description, url: absoluteUrl(path), type: 'article' as const },
      twitter: { card: 'summary_large_image' as const, title, description },
    };
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

function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(
    new Date(iso),
  );
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

export default async function EventDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { ref } = await searchParams;
  // El código RP viaja por la URL hasta el checkout. Así, aunque el usuario no
  // tenga sesión, el middleware lo conserva en el `from` al mandar a login y el
  // checkout lo recibe de vuelta — sin depender de localStorage (que Safari/ITP
  // o incógnito pueden borrar). RefTracker igual lo guarda como respaldo.
  const refQuery = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  let event: CatalogEventDetail;
  try {
    event = await publicFetch<CatalogEventDetail>(`/catalog/events/${id}`, {
      revalidate: 300,
      tags: [`event:${id}`],
    });
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }

  // Try to fetch loyalty status to display tier-gate UX. If user is not
  // signed in or backend is not ready yet, the tier check is skipped and
  // the backend will still 403 on order creation.
  let userTier: LoyaltyTier | null = null;
  try {
    const loyalty = await serverFetch<LoyaltyStatus>('/me/loyalty');
    userTier = loyalty.tier;
  } catch {
    userTier = null;
  }

  const eventPath = `${paths.evento}/${id}`;
  const cheapestTier = event.tiers.reduce<{ priceCents: number; currency: string } | null>(
    (min, t) => (min == null || t.priceCents < min.priceCents ? t : min),
    null,
  );

  const placeName = event.venue?.name ?? event.externalVenueName ?? null;
  const cityLabel = event.venue?.city ?? event.externalVenueCity ?? null;
  const fullAddress = event.venue?.address ?? event.externalVenueAddress ?? null;
  const mapsQuery =
    event.externalVenueLat != null && event.externalVenueLng != null
      ? `${event.externalVenueLat},${event.externalVenueLng}`
      : [placeName, fullAddress, cityLabel].filter(Boolean).join(', ') || null;
  const mapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : null;
  const sameDay =
    new Date(event.startsAt).toDateString() === new Date(event.endsAt).toDateString();

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8 sm:py-10">
      <JsonLd
        data={eventLd({
          name: event.title,
          description: event.description,
          startDate: event.startsAt,
          endDate: event.endsAt,
          image: event.coverImageUrl,
          path: eventPath,
          locationName: event.venue?.name ?? event.externalVenueName,
          city: event.venue?.city ?? event.externalVenueCity,
          priceCents: cheapestTier?.priceCents,
          currency: cheapestTier?.currency,
        })}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: 'Inicio', path: paths.appHome },
          { name: 'Eventos', path: paths.eventos },
          { name: event.title, path: eventPath },
        ])}
      />
      <Link
        href={
          event.venue
            ? `${paths.bar}/${event.venue.slug}`
            : event.promoter
              ? `${paths.promotora}/${event.promoter.slug}`
              : paths.appHome
        }
        className="np-rise inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground active:scale-95 transform-gpu"
      >
        <ArrowLeft className="size-4" />
        {event.venue?.name ?? event.promoter?.name ?? 'Volver'}
      </Link>

      <section className="np-rise mt-5 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025]" style={{ animationDelay: '80ms' }}>
        <div className="group relative aspect-video bg-gradient-to-br from-purple-900/40 to-purple-600/10">
          {event.coverImageUrl ? (
            <Image
              src={event.coverImageUrl}
              alt={event.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover transform-gpu transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
            />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            <p className="np-rise text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary" style={{ animationDelay: '160ms' }}>
              <Calendar className="mr-1 inline size-3" />
              {formatDate(event.startsAt)}
            </p>
            <h1 className="np-rise mt-2 break-words font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-4xl" style={{ animationDelay: '220ms' }}>
              {event.title}
            </h1>
            <p className="np-rise mt-1.5 flex items-center gap-1.5 text-sm text-white/75" style={{ animationDelay: '280ms' }}>
              <MapPin className="size-3.5" />
              {event.venue
                ? `${event.venue.name} · ${event.venue.city}`
                : event.externalVenueName
                  ? `${event.externalVenueName}${event.externalVenueCity ? ` · ${event.externalVenueCity}` : ''}`
                  : event.promoter?.name ?? ''}
            </p>
            {event.promoter && event.venue && (
              <Link
                href={`${paths.promotora}/${event.promoter.slug}`}
                className="np-rise mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80 backdrop-blur transition hover:bg-white/[0.12] active:scale-95"
                style={{ animationDelay: '320ms' }}
              >
                Organiza · {event.promoter.name}
              </Link>
            )}
          </div>
        </div>

        {event.description && (
          <div className="np-rise border-t border-white/8 p-5 sm:p-7" style={{ animationDelay: '340ms' }}>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{event.description}</p>
          </div>
        )}
      </section>

      <section
        className="np-rise mt-5 rounded-[22px] border border-white/10 bg-white/[0.025] p-5 sm:p-7"
        style={{ animationDelay: '350ms' }}
      >
        <h2 className="mb-4 font-display text-lg font-bold tracking-tight">Detalles</h2>
        <dl className="grid gap-5 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Cuándo</dt>
              <dd className="mt-0.5 text-sm capitalize text-foreground">{formatDate(event.startsAt)}</dd>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Horario</dt>
              <dd className="mt-0.5 text-sm text-foreground">
                {formatTime(event.startsAt)} – {formatTime(event.endsAt)}
                {!sameDay ? ` (${formatShortDate(event.endsAt)})` : ''}
              </dd>
            </div>
          </div>

          {(placeName || cityLabel) && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Dónde</dt>
                <dd className="mt-0.5 text-sm text-foreground">
                  {placeName}
                  {cityLabel ? ` · ${cityLabel}` : ''}
                  {fullAddress ? <span className="block text-xs text-muted-foreground">{fullAddress}</span> : null}
                </dd>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:underline active:scale-95"
                  >
                    <Navigation className="size-3" />
                    Ver en mapa
                  </a>
                )}
              </div>
            </div>
          )}

          {event.promoter && (
            <div className="flex items-start gap-3">
              {event.promoter.logoUrl ? (
                <Image
                  src={event.promoter.logoUrl}
                  alt={event.promoter.name}
                  width={60}
                  height={60}
                  sizes="20px"
                  quality={90}
                  className="mt-0.5 size-5 shrink-0 rounded-full object-cover"
                />
              ) : (
                <Users className="mt-0.5 size-4 shrink-0 text-primary" />
              )}
              <div className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Organiza</dt>
                <dd className="mt-0.5 text-sm text-foreground">
                  <Link href={`${paths.promotora}/${event.promoter.slug}`} className="transition hover:text-primary">
                    {event.promoter.name}
                  </Link>
                </dd>
              </div>
            </div>
          )}

          {event.capacity != null && (
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Aforo</dt>
                <dd className="mt-0.5 text-sm text-foreground">{event.capacity} lugares</dd>
                <EventAforo sold={event.sold} capacity={event.capacity} className="mt-2 max-w-[260px]" />
              </div>
            </div>
          )}

          {cheapestTier && (
            <div className="flex items-start gap-3">
              <TrendingUp className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Desde</dt>
                <dd className="mt-0.5 text-sm font-semibold text-foreground">
                  {formatPrice(cheapestTier.priceCents, cheapestTier.currency)}
                </dd>
              </div>
            </div>
          )}
        </dl>
      </section>

      {event.flyerImageUrl && (
        <section
          className="np-rise mt-5 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025]"
          style={{ animationDelay: '360ms' }}
        >
          <Image
            src={event.flyerImageUrl}
            alt={`Flyer — ${event.title}`}
            width={1080}
            height={1920}
            sizes="(max-width: 768px) 100vw, 768px"
            className="h-auto w-full object-contain"
          />
        </section>
      )}

      <EventStoriesSection eventId={event.id} />

      <EventForumSection
        eventId={event.id}
        startsAt={event.startsAt}
        endsAt={event.endsAt}
      />

      <section className="np-rise mt-8" style={{ animationDelay: '400ms' }}>
        <h2 className="mb-4 font-display text-xl font-bold tracking-tight">Boletos</h2>
        {event.tiers.length === 0 ? (
          <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-8 text-center text-sm text-muted-foreground">
            Aún no hay tiers disponibles.
          </div>
        ) : (
          <ul className="space-y-3">
            {event.tiers.map((tier, i) => {
              const requires = tier.minLoyaltyTier ?? null;
              const userRank = userTier ? LOYALTY_TIER_RANK[userTier] : 0;
              const requiredRank = requires ? LOYALTY_TIER_RANK[requires] : 0;
              const locked = !!requires && userRank < requiredRank;
              const requiredLabel = requires ? TIER_STYLES[requires].label : null;
              return (
                <li
                  key={tier.id}
                  className="np-rise flex flex-col gap-3 rounded-[18px] border border-white/10 bg-white/[0.025] p-4 transform-gpu transition-all duration-300 ease-out hover:border-white/20 hover:bg-white/[0.04] active:scale-[0.98] active:duration-100 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5"
                  style={{ animationDelay: `${Math.min(280 + i * 40, 520)}ms` }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-base font-bold tracking-tight">
                        {tier.name}
                      </p>
                      {requires ? (
                        <span
                          className={
                            locked
                              ? 'inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200'
                              : 'inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70'
                          }
                        >
                          {locked ? <Lock className="size-2.5" /> : null}
                          {locked ? 'Requiere' : 'Tier'} {requiredLabel}
                          {!locked ? '+' : ''}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tier.capacity ? `${tier.capacity} lugares` : 'Sin límite'}
                    </p>
                    {tier.nextPrice ? (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                        <TrendingUp className="size-3" />
                        Sube a {formatPrice(tier.nextPrice.priceCents, tier.currency)} el{' '}
                        {formatShortDate(tier.nextPrice.startsAt)}
                      </p>
                    ) : null}
                    {locked ? (
                      <Link
                        href={paths.recompensas}
                        className="mt-2 inline-flex items-center text-[11px] font-semibold text-primary transition active:scale-95 transform-gpu hover:underline"
                      >
                        ¿Cómo subo de tier? →
                      </Link>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="font-display text-lg font-bold tabular-nums">
                      {formatPrice(tier.priceCents, tier.currency)}
                    </span>
                    {locked ? (
                      <span
                        aria-disabled
                        className="shrink-0 cursor-not-allowed rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/45"
                      >
                        Bloqueado
                      </span>
                    ) : (
                      <Link
                        href={`${paths.checkout}/${tier.id}${refQuery}`}
                        className="np-glow-pulse shrink-0 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)] transform-gpu transition active:scale-95 hover:brightness-110"
                      >
                        Comprar
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
