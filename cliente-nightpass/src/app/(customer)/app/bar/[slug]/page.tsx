import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  ExternalLink,
  MapPin,
  Music2,
  Phone,
  Shirt,
  Sparkles,
  Users,
  Utensils,
} from 'lucide-react';
import { ServerApiError, publicFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import { absoluteUrl } from '@/core/config/env';
import { JsonLd, localBusinessLd, breadcrumbLd } from '@/core/seo/json-ld';
import type { CatalogVenueDetail } from '@/core/types/api';
import { StoryRing } from '@/features/stories-public';
import { computeOpenStatus, formatOpenHours } from '@/core/lib/utils/open-hours';
import { FeaturedAforo } from '../../../_components/featured-aforo';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const venue = await publicFetch<CatalogVenueDetail>(`/catalog/venues/${slug}`, {
      revalidate: 300,
    });
    const title = `${venue.name} — NightPass`;
    const description = venue.description ?? `Compra tu cover para ${venue.name} en ${venue.city}.`;
    const path = `${paths.bar}/${slug}`;
    return {
      title,
      description,
      alternates: { canonical: path },
      openGraph: { title, description, url: absoluteUrl(path), type: 'website' as const },
      twitter: { card: 'summary_large_image' as const, title, description },
    };
  } catch {
    return { title: 'Bar — NightPass' };
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


export default async function VenueDetailPage({ params }: Props) {
  const { slug } = await params;
  let venue: CatalogVenueDetail;
  try {
    venue = await publicFetch<CatalogVenueDetail>(`/catalog/venues/${slug}`, { revalidate: 300 });
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }

  const venuePath = `${paths.bar}/${slug}`;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-10">
      <JsonLd
        data={localBusinessLd({
          name: venue.name,
          description: venue.description,
          image: venue.coverImageUrl,
          path: venuePath,
          city: venue.city,
          address: venue.address,
        })}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: 'Inicio', path: paths.appHome },
          { name: 'Bares', path: paths.appHome },
          { name: venue.name, path: venuePath },
        ])}
      />
      <Link
        href={paths.appHome}
        className="np-rise inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground active:scale-95 transform-gpu"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>

      {/* Hero */}
      <section className="np-rise mt-5 overflow-hidden rounded-[22px] border border-white/14 bg-white/[0.05]" style={{ animationDelay: '80ms' }}>
        <div className="group relative aspect-video bg-gradient-to-br from-purple-900/40 to-purple-600/10 sm:aspect-[16/9]">
          {venue.coverImageUrl ? (
            <Image
              src={venue.coverImageUrl}
              alt={venue.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover transform-gpu transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
            />
          ) : null}
          <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
            <StoryRing
              slug={venue.slug}
              venueName={venue.name}
              coverImageUrl={venue.coverImageUrl}
              size="lg"
              hideIfEmpty
            />
          </div>
        </div>

        <div className="np-rise p-5 sm:p-8" style={{ animationDelay: '160ms' }}>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {venue.name}
          </h1>
          <p className="np-rise mt-2 flex items-start gap-1.5 text-sm text-muted-foreground" style={{ animationDelay: '220ms' }}>
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>{[venue.city, venue.address].filter(Boolean).join(' · ')}</span>
          </p>
          {venue.categories && venue.categories.length > 0 && (
            <div className="np-rise mt-3 flex flex-wrap items-center gap-1.5" style={{ animationDelay: '280ms' }}>
              {venue.categories.map((c, i) => (
                <span
                  key={c}
                  className="np-rise rounded-full border border-primary/30 bg-primary/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary"
                  style={{ animationDelay: `${320 + i * 60}ms` }}
                >
                  {c}
                </span>
              ))}
            </div>
          )}
          {venue.description && (
            <p className="np-rise mt-4 text-sm leading-relaxed text-muted-foreground" style={{ animationDelay: '360ms' }}>
              {venue.description}
            </p>
          )}
        </div>
      </section>

      {/* Estado actual: abierto / cerrado + Aforo */}
      {(() => {
        const status = computeOpenStatus(venue.openHours);
        return (
          <section className="np-rise mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2" style={{ animationDelay: '370ms' }}>
            <div
              className={
                status.open
                  ? 'flex items-center justify-between gap-3 rounded-[18px] border border-emerald-400/35 bg-emerald-500/10 p-4'
                  : 'flex items-center justify-between gap-3 rounded-[18px] border border-rose-500/30 bg-rose-500/8 p-4'
              }
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  Estado ahora
                </p>
                <p
                  className={
                    status.open
                      ? 'mt-1 font-display text-2xl font-bold text-emerald-300'
                      : 'mt-1 font-display text-2xl font-bold text-rose-300'
                  }
                >
                  {status.open ? 'ABIERTO' : 'CERRADO'}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {status.open && status.closesAt
                    ? `Cierra a las ${status.closesAt}`
                    : status.opensAt
                      ? `Abre ${status.opensAt}`
                      : 'Consulta horarios'}
                </p>
              </div>
              <span
                aria-hidden
                className={
                  status.open
                    ? 'inline-block size-3 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.85)]'
                    : 'inline-block size-3 rounded-full bg-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.7)]'
                }
              />
            </div>
            <div className="rounded-[18px] border border-white/14 bg-white/[0.05] p-4">
              <FeaturedAforo venueId={venue.id} isClosed={!status.open} />
            </div>
          </section>
        );
      })()}

      {/* Quick stats */}
      {(() => {
        const stats: Array<{ icon: ReactNode; label: string; value: string }> = [];
        if (venue.priceFromCents != null && venue.currency) {
          stats.push({
            icon: <DollarSign className="size-4" />,
            label: 'Cover desde',
            value: formatPrice(venue.priceFromCents, venue.currency),
          });
        }
        if (venue.minAge != null) {
          stats.push({
            icon: <Sparkles className="size-4" />,
            label: 'Edad mínima',
            value: `${venue.minAge}+`,
          });
        }
        if (venue.capacity != null) {
          stats.push({
            icon: <Users className="size-4" />,
            label: 'Capacidad',
            value: `${venue.capacity}`,
          });
        }
        if (venue.dressCode) {
          stats.push({
            icon: <Shirt className="size-4" />,
            label: 'Dress code',
            value: venue.dressCode,
          });
        }
        if (stats.length === 0) return null;
        return (
          <section className="np-rise mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" style={{ animationDelay: '380ms' }}>
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-[16px] border border-white/14 bg-white/[0.05] p-3"
              >
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {s.icon}
                  {s.label}
                </div>
                <p className="mt-1 truncate font-display text-base font-bold text-foreground">
                  {s.value}
                </p>
              </div>
            ))}
          </section>
        );
      })()}

      {/* Música */}
      {venue.musicTypes && venue.musicTypes.length > 0 && (
        <section className="np-rise mt-6" style={{ animationDelay: '400ms' }}>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <Music2 className="size-4 text-primary" />
            Música
          </h2>
          <div className="flex flex-wrap gap-2">
            {venue.musicTypes.map((m) => (
              <span
                key={m}
                className="rounded-full border border-white/14 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-white/85"
              >
                {m}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Galería */}
      {venue.photos && venue.photos.length > 0 && (
        <section className="np-rise mt-8" style={{ animationDelay: '440ms' }}>
          <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Galería</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {venue.photos.map((p) => (
              <div
                key={p.id}
                className="relative aspect-square overflow-hidden rounded-[14px] border border-white/12 bg-white/[0.035]"
              >
                <Image
                  src={p.url}
                  alt={`${venue.name} foto`}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  loading="lazy"
                  className="object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Horarios */}
      {(() => {
        const hours = formatOpenHours(venue.openHours);
        if (hours.length === 0) return null;
        return (
          <section className="np-rise mt-8" style={{ animationDelay: '480ms' }}>
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold tracking-tight">
              <Clock className="size-4 text-primary" />
              Horarios
            </h2>
            <div className="rounded-[18px] border border-white/14 bg-white/[0.05] p-4">
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {hours.map((h) => (
                  <div key={h.day} className="flex items-center justify-between gap-3 text-sm">
                    <dt className="font-semibold text-foreground">{h.day}</dt>
                    <dd className="text-muted-foreground">{h.hours}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        );
      })()}

      {/* Contacto + Mapa */}
      {(venue.phone || venue.googleMapsUrl || venue.menuUrl) && (
        <section className="np-rise mt-8" style={{ animationDelay: '520ms' }}>
          <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Contacto</h2>
          <div className="flex flex-wrap gap-2">
            {venue.phone && (
              <a
                href={`tel:${venue.phone}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[0.07] px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/[0.11] active:scale-95"
              >
                <Phone className="size-4" />
                {venue.phone}
              </a>
            )}
            {venue.googleMapsUrl && (
              <a
                href={venue.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[0.07] px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/[0.11] active:scale-95"
              >
                <MapPin className="size-4" />
                Cómo llegar
                <ExternalLink className="size-3 text-muted-foreground" />
              </a>
            )}
            {venue.menuUrl && (
              <a
                href={venue.menuUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[0.07] px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/[0.11] active:scale-95"
              >
                <Utensils className="size-4" />
                Menú
                <ExternalLink className="size-3 text-muted-foreground" />
              </a>
            )}
          </div>
        </section>
      )}

      {/* Eventos */}
      <section className="np-rise mt-8" style={{ animationDelay: '420ms' }}>
        <h2 className="mb-4 font-display text-xl font-bold tracking-tight">Próximos eventos</h2>
        {(venue.events?.length ?? 0) === 0 ? (
          <div className="rounded-[22px] border border-white/14 bg-white/[0.05] p-8 text-center text-sm text-muted-foreground">
            Aún no hay eventos publicados.
          </div>
        ) : (
          <ul className="space-y-3">
            {venue.events.map((ev, i) => {
              const cheapest = ev.tiers?.reduce(
                (min, t) => (min == null || t.priceCents < min.priceCents ? t : min),
                null as null | { priceCents: number; currency: string },
              );
              return (
                <li
                  key={ev.id}
                  className="np-rise overflow-hidden rounded-[20px] border border-white/14 bg-white/[0.05] transform-gpu transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/22 hover:bg-white/[0.08] hover:shadow-[0_18px_40px_-20px_rgba(168,85,247,0.45)] active:scale-[0.98] active:duration-100"
                  style={{ animationDelay: `${Math.min(280 + i * 40, 560)}ms` }}
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
                        <div className="absolute inset-0 grid place-items-center text-2xl text-white/30">
                          ★
                        </div>
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
