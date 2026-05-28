import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Calendar, MapPin, Music2, Search, Sparkles } from 'lucide-react';
import { serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import { VenueCard } from '../_components/venue-card';
import { FeaturedAforo } from '../_components/featured-aforo';
import { computeOpenStatus } from '@/core/lib/utils/open-hours';
import type { CatalogVenueSummary, VenueStoriesGroup } from '@/core/types/api';
import { InstallBanner, AppOpenPinger } from '@/features/geolocation';
import { StoriesCarousel } from '@/features/stories-public';

export const metadata = {
  title: 'NightPass — Descubre la noche cerca de ti',
  description:
    'Encuentra bares y discos cerca, compra tu cover digital y entra sin filas con tu pase QR.',
};

interface CatalogResponse {
  items: CatalogVenueSummary[];
  total: number;
  page: number;
  limit: number;
}

interface CatalogEventFeed {
  id: string;
  title: string;
  startsAt: string;
  coverImageUrl: string | null;
  externalVenueName: string | null;
  externalVenueCity: string | null;
  venue: { id: string; slug: string; name: string; city: string } | null;
  promoter: { id: string; slug: string; name: string; logoUrl: string | null } | null;
  tiers: Array<{ id: string; priceCents: number; currency: string }>;
}

interface CatalogEventsResponse {
  items: CatalogEventFeed[];
  total: number;
}

const QUICK_FILTERS = [
  { label: 'Esta noche', q: '' },
  { label: 'Reggaetón', q: 'reggaeton' },
  { label: 'Techno', q: 'techno' },
  { label: 'House', q: 'house' },
  { label: 'Rooftop', q: 'rooftop' },
  { label: 'Indie', q: 'indie' },
];

function formatPrice(cents: number | null, currency: string | null): string | null {
  if (cents == null) return null;
  const amount = (cents / 100).toFixed(0);
  const sym = currency?.toLowerCase() === 'eur' ? '€' : '$';
  const suffix = currency?.toLowerCase() === 'mxn' ? ' MXN' : '';
  return `${sym}${amount}${suffix}`;
}

function FeaturedVenue({ venue }: { venue: CatalogVenueSummary }) {
  const price = formatPrice(venue.priceFromCents, venue.currency);
  const tags = [...(venue.musicTypes ?? []), ...(venue.categories ?? [])].slice(0, 3);
  const status = computeOpenStatus(venue.openHours);

  return (
    <Link
      href={`${paths.bar}/${venue.slug}`}
      className="group block overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02] transition hover:border-white/20"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr]">
        <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[420px]">
          {venue.coverImageUrl ? (
            <Image
              src={venue.coverImageUrl}
              alt={venue.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-purple-600/10" />
          )}

          <div className="absolute left-5 top-5 flex flex-wrap gap-2">
            <span
              className={
                status.open
                  ? 'inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200 backdrop-blur-md'
                  : 'inline-flex items-center gap-1.5 rounded-full border border-rose-500/45 bg-rose-500/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-200 backdrop-blur-md'
              }
            >
              <span
                className={
                  status.open
                    ? 'size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]'
                    : 'size-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]'
                }
              />
              {status.open ? 'Abierto' : 'Cerrado'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur-md">
              <Sparkles className="size-3 text-primary" /> Pick de hoy
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5 p-6 sm:p-7">
          <div>
            <h3 className="font-display text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
              {venue.name}
            </h3>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5 text-primary" />
                {venue.address ?? venue.city}
              </span>
              {venue.musicTypes?.[0] && (
                <>
                  <span className="text-white/30">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Music2 className="size-3.5" />
                    {venue.musicTypes.slice(0, 2).join(' · ')}
                  </span>
                </>
              )}
            </p>
          </div>

          <FeaturedAforo
            venueId={venue.id}
            isClosed={!status.open}
          />

          {venue.description && (
            <p className="text-[14.5px] leading-relaxed text-white/70">
              {venue.description.length > 220
                ? `${venue.description.slice(0, 220)}…`
                : venue.description}
            </p>
          )}

          {(price || venue.minAge != null || venue.dressCode) && (
            <div className="grid grid-cols-2 gap-3">
              {price && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                    Cover desde
                  </p>
                  <p className="mt-1.5 font-display text-2xl font-bold tracking-[-0.02em] text-white">
                    {price}
                  </p>
                </div>
              )}
              {venue.minAge != null && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                    Edad mínima
                  </p>
                  <p className="mt-1.5 font-display text-2xl font-bold tracking-[-0.02em] text-white">
                    {venue.minAge}+
                  </p>
                </div>
              )}
              {venue.dressCode && !price && venue.minAge == null && (
                <div className="col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                    Dress code
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-white">{venue.dressCode}</p>
                </div>
              )}
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/75"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto flex flex-col gap-2 sm:flex-row">
            <span className="group/btn inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(168,85,247,0.6)] transition group-hover:from-[#7e22ce] group-hover:to-[#9333ea]">
              {price ? `Comprar pase · ${price}` : 'Ver detalles'}
              <ArrowRight className="size-4 transition group-hover/btn:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function CustomerHomePage() {
  let venues: CatalogVenueSummary[] = [];
  try {
    const data = await serverFetch<CatalogResponse>('/catalog/venues?limit=24');
    venues = data.items ?? [];
  } catch {
    venues = [];
  }

  let initialStoriesGroups: VenueStoriesGroup[] = [];
  try {
    initialStoriesGroups = await serverFetch<VenueStoriesGroup[]>('/catalog/stories/active');
  } catch {
    initialStoriesGroups = [];
  }

  let events: CatalogEventFeed[] = [];
  try {
    const data = await serverFetch<CatalogEventsResponse>('/catalog/events?date=week&limit=6');
    events = data.items ?? [];
  } catch {
    events = [];
  }

  const [featured, ...rest] = venues;
  const featuredCity = featured?.city ?? 'tu ciudad';

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <InstallBanner />
      <AppOpenPinger />

      {/* ── HERO ── */}
      <section className="mb-12 max-w-3xl">
        <p
          className="np-rise text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] text-primary"
          style={{ animationDelay: '0ms' }}
        >
          Vive la noche · Sin filas
        </p>
        <h1
          className="np-rise mt-4 font-display text-5xl font-bold leading-[0.95] tracking-[-0.035em] sm:text-6xl lg:text-7xl"
          style={{ animationDelay: '80ms' }}
        >
          Descubre dónde{' '}
          <span className="font-serif text-[1.05em] italic font-normal text-purple-200">
            sales esta noche.
          </span>
        </h1>
        <p
          className="np-rise mt-6 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg"
          style={{ animationDelay: '160ms' }}
        >
          Compra tu cover digital con QR seguro y entra al toque. Sin efectivo, sin tickets.
        </p>

        {/* Search */}
        <div
          className="np-rise mt-8 flex flex-col gap-3"
          style={{ animationDelay: '240ms' }}
        >
          <Link
            href={paths.buscar}
            className="inline-flex w-full max-w-xl items-center gap-3 rounded-full border border-white/12 bg-white/[0.04] px-5 py-3.5 text-sm text-white/55 transform-gpu transition-all duration-200 hover:border-white/25 hover:bg-white/[0.06] active:scale-[0.98]"
          >
            <Search className="size-4" />
            <span className="flex-1">Buscar un bar, ciudad o género…</span>
            <span className="hidden rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/40 sm:inline">
              ⌘K
            </span>
          </Link>

          {/* Quick filter chips */}
          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map((f, i) => (
              <Link
                key={f.label}
                href={f.q ? `${paths.buscar}?q=${encodeURIComponent(f.q)}` : paths.buscar}
                className={
                  (i === 0
                    ? 'rounded-full border border-primary/40 bg-primary/15 px-3.5 py-1.5 text-xs font-semibold text-purple-100 hover:bg-primary/20'
                    : 'rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-semibold text-white/75 hover:border-white/20 hover:bg-white/[0.06]') +
                  ' transform-gpu transition-all duration-200 active:scale-95'
                }
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {initialStoriesGroups.length > 0 && (
        <section className="np-rise mb-10" style={{ animationDelay: '280ms' }}>
          <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-[0.22em] text-primary/80">
            Historias en vivo
          </h2>
          <StoriesCarousel initialGroups={initialStoriesGroups} />
        </section>
      )}

      {/* ── FEATURED ── */}
      {featured ? (
        <section className="np-rise mb-12" style={{ animationDelay: '320ms' }}>
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="font-display text-xl font-bold tracking-[-0.015em] sm:text-2xl">
              Esta noche en {featuredCity}
            </h2>
            <Link
              href={paths.buscar}
              className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary transform-gpu transition-all duration-200 hover:text-primary/80 active:scale-95"
            >
              Ver todos →
            </Link>
          </div>
          <FeaturedVenue venue={featured} />
        </section>
      ) : (
        <section
          className="np-rise mb-12 rounded-[22px] border border-white/10 bg-white/[0.025] p-10 text-center"
          style={{ animationDelay: '320ms' }}
        >
          <p className="text-sm text-white/60">
            Aún no hay bares disponibles. Vuelve más tarde.
          </p>
        </section>
      )}

      {/* ── REST GRID ── */}
      {rest.length > 0 && (
        <section className="mb-12">
          <h2
            className="np-rise mb-5 font-display text-lg font-bold tracking-[-0.01em] text-white/85"
            style={{ animationDelay: '380ms' }}
          >
            Más opciones para esta noche
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((v, i) => (
              <div
                key={v.id}
                className="np-rise"
                style={{ animationDelay: `${Math.min(240 + i * 40, 560)}ms` }}
              >
                <VenueCard venue={v} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── EVENTS THIS WEEK ── */}
      {events.length > 0 && (
        <section className="mb-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2
              className="np-rise font-display text-xl font-bold tracking-[-0.015em] sm:text-2xl"
              style={{ animationDelay: '500ms' }}
            >
              Eventos esta semana
            </h2>
            <Link
              href={paths.buscar}
              className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary transform-gpu transition-all duration-200 hover:text-primary/80 active:scale-95"
            >
              Ver todos →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((ev, i) => {
              const cheapest = ev.tiers?.reduce(
                (min, t) => (min == null || t.priceCents < min.priceCents ? t : min),
                null as null | { priceCents: number; currency: string },
              );
              const cheapestPrice = cheapest
                ? `$${(cheapest.priceCents / 100).toFixed(0)}${cheapest.currency.toLowerCase() === 'mxn' ? ' MXN' : ''}`
                : null;
              const locationLabel = ev.venue
                ? `${ev.venue.name} · ${ev.venue.city}`
                : ev.externalVenueName
                  ? `${ev.externalVenueName}${ev.externalVenueCity ? ` · ${ev.externalVenueCity}` : ''}`
                  : ev.promoter?.name ?? '';
              const dateLabel = new Intl.DateTimeFormat('es-MX', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(ev.startsAt));
              return (
                <Link
                  key={ev.id}
                  href={`${paths.evento}/${ev.id}`}
                  className="np-rise group block overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.025] transform-gpu transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] hover:shadow-[0_18px_40px_-20px_rgba(168,85,247,0.45)] active:scale-[0.98]"
                  style={{ animationDelay: `${540 + i * 70}ms` }}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-purple-900/40 to-purple-600/10">
                    {ev.coverImageUrl ? (
                      <Image
                        src={ev.coverImageUrl}
                        alt={ev.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transform-gpu transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-3xl text-white/30">
                        ★
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    {cheapestPrice && (
                      <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                        Desde {cheapestPrice}
                      </span>
                    )}
                    {ev.promoter && (
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur">
                        <Sparkles className="size-3" />
                        {ev.promoter.name}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                      <Calendar className="mr-1 inline size-3" />
                      {dateLabel}
                    </p>
                    <h3 className="font-display text-base font-bold leading-tight tracking-tight line-clamp-2">
                      {ev.title}
                    </h3>
                    <p className="flex items-center gap-1 text-xs text-white/60 line-clamp-1">
                      <MapPin className="size-3 shrink-0" />
                      {locationLabel}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── OWNER / PROMOTER CTA STRIP ── */}
      <section className="mb-4">
        <div className="rounded-2xl border border-primary/22 bg-primary/[0.06] p-5 sm:p-6">
          <p className="font-display text-base font-semibold text-white sm:text-lg">
            ¿Eres parte de la noche?
          </p>
          <p className="mt-1 text-sm text-white/65">
            Súmate a NightPass como local o como organizador de eventos.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href={paths.solicitarLocal}
              className="group/cta inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-primary bg-primary/10 px-5 py-2.5 text-sm font-semibold text-white transform-gpu transition-all duration-200 hover:bg-primary/20 active:scale-95"
            >
              Soy un local
              <ArrowRight className="size-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
            </Link>
            <Link
              href={paths.solicitarOrganizador}
              className="group/cta inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white transform-gpu transition-all duration-200 hover:bg-white/[0.08] active:scale-95"
            >
              Soy organizador
              <ArrowRight className="size-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
