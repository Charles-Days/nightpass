import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { CatalogVenueDetail } from '@/core/types/api';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const venue = await serverFetch<CatalogVenueDetail>(`/catalog/venues/${slug}`);
    return {
      title: `${venue.name} — NightPass`,
      description: venue.description ?? `Compra tu cover para ${venue.name} en ${venue.city}.`,
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
    venue = await serverFetch<CatalogVenueDetail>(`/catalog/venues/${slug}`);
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
      <section className="np-rise mt-5 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025]" style={{ animationDelay: '80ms' }}>
        <div className="group relative aspect-video bg-gradient-to-br from-purple-900/40 to-purple-600/10 sm:aspect-[16/9]">
          {venue.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={venue.coverImageUrl}
              alt={venue.name}
              className="absolute inset-0 size-full object-cover transform-gpu transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
            />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
            <h1 className="np-rise font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl" style={{ animationDelay: '160ms' }}>
              {venue.name}
            </h1>
            <p className="np-rise mt-2 flex items-center gap-1.5 text-sm text-white/75" style={{ animationDelay: '220ms' }}>
              <MapPin className="size-3.5" />
              {[venue.city, venue.address].filter(Boolean).join(' · ')}
            </p>
            <div className="np-rise mt-3 flex flex-wrap items-center gap-1.5" style={{ animationDelay: '280ms' }}>
              {venue.categories?.map((c, i) => (
                <span
                  key={c}
                  className="np-rise rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-white"
                  style={{ animationDelay: `${320 + i * 60}ms` }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        {venue.description && (
          <div className="np-rise border-t border-white/8 p-5 sm:p-8" style={{ animationDelay: '360ms' }}>
            <p className="text-sm leading-relaxed text-muted-foreground">{venue.description}</p>
          </div>
        )}
      </section>

      {/* Eventos */}
      <section className="np-rise mt-8" style={{ animationDelay: '420ms' }}>
        <h2 className="mb-4 font-display text-xl font-bold tracking-tight">Próximos eventos</h2>
        {(venue.events?.length ?? 0) === 0 ? (
          <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-8 text-center text-sm text-muted-foreground">
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
                  className="np-rise overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.025] transform-gpu transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] hover:shadow-[0_18px_40px_-20px_rgba(168,85,247,0.45)] active:scale-[0.98] active:duration-100"
                  style={{ animationDelay: `${480 + i * 70}ms` }}
                >
                  <Link href={`${paths.evento}/${ev.id}`} className="group flex items-stretch gap-4 p-3 sm:p-4">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[14px] bg-gradient-to-br from-purple-900/40 to-purple-600/10 sm:h-28 sm:w-32">
                      {ev.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ev.coverImageUrl}
                          alt={ev.title}
                          className="absolute inset-0 size-full object-cover transform-gpu transition-transform duration-[600ms] ease-out group-hover:scale-[1.08]"
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
