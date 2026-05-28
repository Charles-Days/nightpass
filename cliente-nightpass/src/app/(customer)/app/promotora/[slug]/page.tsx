import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Globe, Instagram, MapPin, Sparkles } from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { CatalogPromoterDetail } from '@/core/types/api';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const promoter = await serverFetch<CatalogPromoterDetail>(`/catalog/promoters/${slug}`);
    return {
      title: `${promoter.name} — NightPass`,
      description: promoter.bio ?? `Eventos producidos por ${promoter.name} en ${promoter.city}.`,
    };
  } catch {
    return { title: 'Organizador — NightPass' };
  }
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatPrice(cents: number, currency: string) {
  const sym = currency.toLowerCase() === 'mxn' ? '$' : currency.toLowerCase() === 'eur' ? '€' : '$';
  return `${sym}${(cents / 100).toFixed(0)}${currency.toLowerCase() === 'mxn' ? ' MXN' : ''}`;
}

function instagramUrl(handle: string) {
  const clean = handle.replace(/^@/, '').trim();
  return `https://instagram.com/${clean}`;
}

export default async function PromoterDetailPage({ params }: Props) {
  const { slug } = await params;
  let promoter: CatalogPromoterDetail;
  try {
    promoter = await serverFetch<CatalogPromoterDetail>(`/catalog/promoters/${slug}`);
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-10">
      <Link
        href={paths.appHome}
        className="np-rise inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground active:scale-95 transform-gpu"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>

      {/* Hero */}
      <section
        className="np-rise mt-5 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025]"
        style={{ animationDelay: '80ms' }}
      >
        <div className="relative flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-br from-purple-700/15 via-fuchsia-500/10 to-transparent" />

          <div className="relative z-10 grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-purple-700/40 to-fuchsia-600/30 shadow-[0_8px_24px_-6px_rgba(168,85,247,0.45)] sm:size-24">
            {promoter.logoUrl ? (
              <Image
                src={promoter.logoUrl}
                alt={promoter.name}
                fill
                sizes="96px"
                priority
                className="object-cover"
              />
            ) : (
              <Sparkles className="size-8 text-white/70 sm:size-10" />
            )}
          </div>

          <div className="relative z-10 flex-1">
            <p className="np-rise text-[11px] font-semibold uppercase tracking-[0.22em] text-primary" style={{ animationDelay: '120ms' }}>
              Organizador
            </p>
            <h1
              className="np-rise mt-1 font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl"
              style={{ animationDelay: '160ms' }}
            >
              {promoter.name}
            </h1>
            <p
              className="np-rise mt-2 flex items-center gap-1.5 text-sm text-white/75"
              style={{ animationDelay: '220ms' }}
            >
              <MapPin className="size-3.5" />
              {promoter.city}
            </p>
            {(promoter.instagram || promoter.website) && (
              <div className="np-rise mt-3 flex flex-wrap items-center gap-2" style={{ animationDelay: '260ms' }}>
                {promoter.instagram && (
                  <a
                    href={instagramUrl(promoter.instagram)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/80 transition hover:bg-white/[0.08] active:scale-95"
                  >
                    <Instagram className="size-3.5" />
                    @{promoter.instagram.replace(/^@/, '')}
                  </a>
                )}
                {promoter.website && (
                  <a
                    href={promoter.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/80 transition hover:bg-white/[0.08] active:scale-95"
                  >
                    <Globe className="size-3.5" />
                    Sitio
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {promoter.bio && (
          <div className="np-rise relative z-10 border-t border-white/8 p-5 sm:p-8" style={{ animationDelay: '320ms' }}>
            <p className="text-sm leading-relaxed text-muted-foreground">{promoter.bio}</p>
          </div>
        )}
      </section>

      {/* Eventos */}
      <section className="np-rise mt-8" style={{ animationDelay: '380ms' }}>
        <h2 className="mb-4 font-display text-xl font-bold tracking-tight">Próximos eventos</h2>
        {promoter.events.length === 0 ? (
          <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-8 text-center text-sm text-muted-foreground">
            Aún no hay eventos publicados.
          </div>
        ) : (
          <ul className="space-y-3">
            {promoter.events.map((ev, i) => {
              const cheapest = ev.tiers?.reduce(
                (min, t) => (min == null || t.priceCents < min.priceCents ? t : min),
                null as null | { priceCents: number; currency: string },
              );
              const venueLabel = ev.venue
                ? `${ev.venue.name} · ${ev.venue.city}`
                : ev.externalVenueName
                  ? `${ev.externalVenueName}${ev.externalVenueCity ? ` · ${ev.externalVenueCity}` : ''}`
                  : null;
              return (
                <li
                  key={ev.id}
                  className="np-rise overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.025] transform-gpu transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] hover:shadow-[0_18px_40px_-20px_rgba(168,85,247,0.45)] active:scale-[0.98] active:duration-100"
                  style={{ animationDelay: `${Math.min(280 + i * 40, 520)}ms` }}
                >
                  <Link href={`${paths.evento}/${ev.id}`} className="group flex items-stretch gap-4 p-3 sm:p-4">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[14px] bg-gradient-to-br from-purple-900/40 to-purple-600/10 sm:h-28 sm:w-32">
                      {ev.coverImageUrl ? (
                        <Image
                          src={ev.coverImageUrl}
                          alt={ev.title}
                          fill
                          sizes="128px"
                          loading="lazy"
                          className="object-cover transform-gpu transition-transform duration-[600ms] ease-out group-hover:scale-[1.08]"
                        />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-2xl text-white/30">★</div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-center gap-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                        <Calendar className="mr-1 inline size-3" />
                        {formatDate(ev.startsAt)}
                      </p>
                      <h3 className="font-display text-base font-bold leading-tight tracking-tight sm:text-lg">
                        {ev.title}
                      </h3>
                      {venueLabel && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          {venueLabel}
                        </p>
                      )}
                      {cheapest && (
                        <p className="text-xs text-muted-foreground">
                          Desde{' '}
                          <span className="font-semibold text-foreground">
                            {formatPrice(cheapest.priceCents, cheapest.currency)}
                          </span>
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
