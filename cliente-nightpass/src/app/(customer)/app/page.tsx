import Link from 'next/link';
import { ArrowRight, MapPin, Music2, Search, Sparkles } from 'lucide-react';
import { serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import { VenueCard } from '../_components/venue-card';
import { FeaturedAforo } from '../_components/featured-aforo';
import type { CatalogVenueSummary } from '@/core/types/api';
import { InstallBanner, AppOpenPinger } from '@/features/geolocation';

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

const QUICK_FILTERS = [
  { label: 'Esta noche', q: '' },
  { label: 'Reggaetón', q: 'reggaeton' },
  { label: 'Techno', q: 'techno' },
  { label: 'House', q: 'house' },
  { label: 'Rooftop', q: 'rooftop' },
  { label: 'Indie', q: 'indie' },
];

const COMING_SOON_TEASERS = [
  { name: 'Más bares en camino', area: 'CDMX', when: 'Esta semana' },
  { name: 'Próximamente', area: 'Roma Norte', when: 'En 2 semanas' },
  { name: 'Próximamente', area: 'Condesa', when: 'En 3 semanas' },
  { name: 'Próximamente', area: 'Polanco', when: 'Pronto' },
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

  return (
    <Link
      href={`${paths.bar}/${venue.slug}`}
      className="group block overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02] transition hover:border-white/20"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr]">
        <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[420px]">
          {venue.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={venue.coverImageUrl}
              alt={venue.name}
              className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-purple-600/10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0712] via-[#0a0712]/40 to-transparent" />

          <div className="absolute left-5 top-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              Activo
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/85">
              <Sparkles className="size-3 text-primary" /> Pick de hoy
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
            <h3 className="font-display text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
              {venue.name}
            </h3>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
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
        </div>

        <div className="flex flex-col gap-5 p-6 sm:p-7">
          <FeaturedAforo venueId={venue.id} />

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
                style={{ animationDelay: `${420 + i * 70}ms` }}
              >
                <VenueCard venue={v} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── COMING SOON ── */}
      <section className="mb-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-base font-bold tracking-[-0.01em] text-white/55">
            Próximamente en {featuredCity}
          </h2>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            Activamos bares nuevos cada semana
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COMING_SOON_TEASERS.map((b, i) => (
            <div
              key={`${b.name}-${i}`}
              className="flex min-h-[140px] flex-col justify-between rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-4 opacity-80"
            >
              <div
                className="size-8 rounded-lg opacity-50"
                style={{
                  background: `linear-gradient(135deg, hsl(${260 + i * 15} 40% 30%), hsl(${290 + i * 10} 35% 20%))`,
                }}
              />
              <div>
                <p className="font-display text-sm font-semibold text-white/85">{b.name}</p>
                <p className="mt-0.5 text-[11px] text-white/45">{b.area}</p>
                <span className="mt-2.5 inline-block rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                  {b.when}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── OWNER CTA STRIP ── */}
      <section className="mb-4">
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-primary/22 bg-primary/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div>
            <p className="font-display text-base font-semibold text-white sm:text-lg">
              ¿Tienes un bar?
            </p>
            <p className="mt-1 text-sm text-white/65">
              Súmate a NightPass y aparece aquí esta misma semana.
            </p>
          </div>
          <Link
            href={paths.solicitarLocal}
            className="group/cta inline-flex shrink-0 items-center gap-2 rounded-full border border-primary px-5 py-2.5 text-sm font-semibold text-white transform-gpu transition-all duration-200 hover:bg-primary/15 active:scale-95"
          >
            Soy un local
            <ArrowRight className="size-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
