'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Calendar, Loader2, MapPin, Search, Sparkles } from 'lucide-react';
import { clientFetch } from '@/core/lib/api/client-client';
import { Input } from '@/core/components/ui/input';
import { paths } from '@/core/config/paths';
import { VenueCard } from '../../../_components/venue-card';
import { EventAforo } from '../../../_components/event-aforo';
import type { CatalogVenueSummary } from '@/core/types/api';

interface CatalogResponse {
  items: CatalogVenueSummary[];
  total: number;
  page: number;
  limit: number;
}

interface EventFeed {
  id: string;
  title: string;
  startsAt: string;
  coverImageUrl: string | null;
  externalVenueName: string | null;
  externalVenueCity: string | null;
  venue: { id: string; slug: string; name: string; city: string } | null;
  promoter: { id: string; slug: string; name: string; logoUrl: string | null } | null;
  tiers: Array<{ id: string; priceCents: number; currency: string }>;
  sold?: number | null;
  capacity?: number | null;
}

interface EventsResponse {
  items: EventFeed[];
  total: number;
}

type Tab = 'venues' | 'events';
type EventDate = 'all' | 'today' | 'week' | 'month';

const EVENT_DATES: { value: EventDate; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
];

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatCheapest(tiers: EventFeed['tiers']) {
  if (!tiers?.length) return null;
  const min = tiers.reduce((acc, t) => (acc == null || t.priceCents < acc.priceCents ? t : acc), null as EventFeed['tiers'][0] | null);
  if (!min) return null;
  const sym = min.currency.toLowerCase() === 'eur' ? '€' : '$';
  const suffix = min.currency.toLowerCase() === 'mxn' ? ' MXN' : '';
  return `${sym}${(min.priceCents / 100).toFixed(0)}${suffix}`;
}

// Relativo amigable para crear urgencia ("Hoy", "Mañana", "En 3 días").
function relativeWhen(iso: string): string | null {
  const now = new Date();
  const target = new Date(iso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(target) - startOfDay(now)) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  if (days <= 7) return `En ${days} días`;
  return null;
}

// Primer resultado destacado — card alargada full-width que resalta sobre el grid.
function FeaturedVenueCard({ venue }: { venue: CatalogVenueSummary }) {
  const tags = [...(venue.musicTypes ?? []), ...(venue.categories ?? [])].slice(0, 3);
  const meta = [
    venue.minAge ? `+${venue.minAge} años` : null,
    venue.dressCode,
  ].filter(Boolean) as string[];
  return (
    <Link
      href={`${paths.bar}/${venue.slug}`}
      className="np-rise group relative mb-4 block overflow-hidden rounded-[24px] border border-primary/25 bg-white/[0.02] shadow-[0_0_44px_-18px_rgba(168,85,247,0.55)] transition hover:border-primary/45 sm:grid sm:grid-cols-[1.45fr_1fr]"
    >
      <div className="relative aspect-[16/10] overflow-hidden sm:aspect-auto sm:min-h-[270px]">
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
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent sm:hidden" />
        <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
          <Sparkles className="size-3 text-purple-200" /> Destacado
        </span>
      </div>
      <div className="flex flex-col justify-center gap-3 p-5 sm:p-7">
        <h3 className="font-display text-2xl font-bold tracking-[-0.02em] text-white sm:text-3xl">
          {venue.name}
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-white/65">
          <MapPin className="size-3.5 text-primary" />
          {venue.address ?? venue.city}
        </p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-white/75"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        {venue.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-white/55">{venue.description}</p>
        )}
        {meta.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] font-medium text-white/70">
            {meta.map((m) => (
              <span key={m} className="inline-flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-primary" />
                {m}
              </span>
            ))}
          </div>
        )}
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-white/55">Reserva tu lugar</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(168,85,247,0.6)] transition group-hover:brightness-110">
            Ver <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function FeaturedEventCard({ ev }: { ev: EventFeed }) {
  const when = relativeWhen(ev.startsAt);
  const where = ev.venue
    ? `${ev.venue.name} · ${ev.venue.city}`
    : ev.externalVenueName
      ? `${ev.externalVenueName}${ev.externalVenueCity ? ` · ${ev.externalVenueCity}` : ''}`
      : ev.promoter?.name ?? '';
  return (
    <Link
      href={`${paths.evento}/${ev.id}`}
      className="np-rise group relative mb-4 block overflow-hidden rounded-[24px] border border-primary/25 bg-white/[0.02] shadow-[0_0_44px_-18px_rgba(168,85,247,0.55)] transition hover:border-primary/45 sm:grid sm:grid-cols-[1.45fr_1fr]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-purple-900/40 to-purple-600/10 sm:aspect-auto sm:min-h-[270px]">
        {ev.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ev.coverImageUrl}
            alt={ev.title}
            className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-5xl text-white/30">★</div>
        )}
        <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
          <Sparkles className="size-3 text-purple-200" /> Destacado
        </span>
        {when && (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/25 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-purple-200" />
            {when}
          </span>
        )}
      </div>
      <div className="flex flex-col justify-center gap-3 p-5 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          <Calendar className="mr-1 inline size-3.5" />
          {formatDate(ev.startsAt)}
        </p>
        <h3 className="line-clamp-2 font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-white sm:text-3xl">
          {ev.title}
        </h3>
        {where && (
          <p className="flex items-center gap-1.5 text-sm text-white/65">
            <MapPin className="size-3.5 shrink-0 text-primary" />
            {where}
          </p>
        )}
        <EventAforo sold={ev.sold} capacity={ev.capacity} className="max-w-[240px]" />
        <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(168,85,247,0.6)] transition group-hover:brightness-110">
          Conseguir pase <ArrowRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}

export function SearchClient({ mode }: { mode?: Tab } = {}) {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const initialTab: Tab =
    mode ?? ((searchParams.get('tab') as Tab) === 'events' ? 'events' : 'venues');

  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState(initialQ);
  const [category, setCategory] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<EventDate>('all');
  const [venues, setVenues] = useState<CatalogVenueSummary[]>([]);
  const [events, setEvents] = useState<EventFeed[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        if (tab === 'venues') {
          const params = new URLSearchParams();
          params.set('limit', '30');
          if (query.trim()) params.set('search', query.trim());
          if (category) params.set('category', category);
          const res = await clientFetch<CatalogResponse>(`/api/catalog/venues?${params.toString()}`);
          if (!cancelled) setVenues(res.items ?? []);
        } else {
          const params = new URLSearchParams();
          params.set('limit', '30');
          if (query.trim()) params.set('search', query.trim());
          if (eventDate !== 'all') params.set('date', eventDate);
          const res = await clientFetch<EventsResponse>(`/api/catalog/events?${params.toString()}`);
          if (!cancelled) setEvents(res.items ?? []);
        }
      } catch {
        if (!cancelled) {
          if (tab === 'venues') setVenues([]);
          else setEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, category, tab, eventDate]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    venues.forEach((v) => v.categories?.forEach((c) => set.add(c)));
    return Array.from(set).slice(0, 8);
  }, [venues]);

  const resultCount = tab === 'venues' ? venues.length : events.length;
  const showChips = tab === 'events' || (tab === 'venues' && categories.length > 0);

  return (
    <div>
      {/* Controles en flujo normal: scrollean con la página (NO sticky). */}
      <div className="-mx-5 mt-4 px-5 pb-3 pt-3 sm:-mx-8 sm:px-8">
        {/* Tabs + search on one row — tabs hidden when mode is fixed by the page */}
        <div className="flex items-center gap-2.5">
          {!mode && (
            <div className="inline-flex shrink-0 gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={() => setTab('venues')}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                  tab === 'venues'
                    ? 'bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)]'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                Bares
              </button>
              <button
                type="button"
                onClick={() => setTab('events')}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                  tab === 'events'
                    ? 'bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)]'
                    : 'text-white/65 hover:text-white'
                }`}
              >
                Eventos
              </button>
            </div>
          )}

          <div className="group relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === 'venues' ? 'Bar, ciudad, género…' : 'Evento, organizador…'}
              className="h-11 rounded-full border-white/15 bg-white/[0.04] pl-11 pr-11 text-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            {loading && query.trim().length > 0 ? (
              <Loader2
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-primary"
              />
            ) : null}
          </div>
        </div>

        {/* Filter chips — single-row horizontal scroll on mobile */}
        {showChips && (
          <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tab === 'venues' ? (
              <>
                <button
                  type="button"
                  onClick={() => setCategory(null)}
                  className={`shrink-0 whitespace-nowrap transform-gpu rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                    category === null
                      ? 'border-primary/40 bg-primary/15 text-primary'
                      : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.07] hover:text-foreground'
                  }`}
                >
                  Todos
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c === category ? null : c)}
                    className={`shrink-0 whitespace-nowrap transform-gpu rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-all duration-200 active:scale-95 ${
                      category === c
                        ? 'border-primary/40 bg-primary/15 text-primary'
                        : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.07] hover:text-foreground'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </>
            ) : (
              EVENT_DATES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setEventDate(d.value)}
                  className={`shrink-0 whitespace-nowrap transform-gpu rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                    eventDate === d.value
                      ? 'border-primary/40 bg-primary/15 text-primary'
                      : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.07] hover:text-foreground'
                  }`}
                >
                  {d.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      {!loading && resultCount > 0 && (
        <p className="mt-4 mb-1 text-xs font-medium text-white/45">
          {resultCount} {tab === 'venues'
            ? resultCount === 1 ? 'bar' : 'bares'
            : resultCount === 1 ? 'evento' : 'eventos'}
        </p>
      )}

      <div className="mt-4">
        {tab === 'venues' ? (
          loading && venues.length === 0 ? (
            <div className="np-fade-in flex flex-col items-center justify-center gap-3 py-12 text-center text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span>Buscando…</span>
            </div>
          ) : venues.length === 0 ? (
            <p className="np-fade-in py-12 text-center text-sm text-muted-foreground">
              No encontramos resultados. Prueba con otra búsqueda.
            </p>
          ) : (
            <>
              <FeaturedVenueCard venue={venues[0]} />
              {venues.length > 1 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {venues.slice(1).map((v, i) => (
                    <div key={v.id} className="np-rise" style={{ animationDelay: `${i * 60}ms` }}>
                      <VenueCard venue={v} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        ) : loading && events.length === 0 ? (
          <div className="np-fade-in flex flex-col items-center justify-center gap-3 py-12 text-center text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span>Buscando eventos…</span>
          </div>
        ) : events.length === 0 ? (
          <p className="np-fade-in py-12 text-center text-sm text-muted-foreground">
            Sin eventos publicados ahora. Vuelve pronto.
          </p>
        ) : (
          <>
            <FeaturedEventCard ev={events[0]} />
            {events.length > 1 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.slice(1).map((ev, i) => {
              const cheapest = formatCheapest(ev.tiers);
              const where = ev.venue
                ? `${ev.venue.name} · ${ev.venue.city}`
                : ev.externalVenueName
                  ? `${ev.externalVenueName}${ev.externalVenueCity ? ` · ${ev.externalVenueCity}` : ''}`
                  : ev.promoter?.name ?? '';
              return (
                <Link
                  key={ev.id}
                  href={`${paths.evento}/${ev.id}`}
                  className="np-rise group block overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.025] transform-gpu transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] hover:shadow-[0_18px_40px_-20px_rgba(168,85,247,0.45)] active:scale-[0.98]"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-purple-900/40 to-purple-600/10">
                    {ev.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ev.coverImageUrl}
                        alt={ev.title}
                        className="absolute inset-0 size-full object-cover transform-gpu transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-3xl text-white/30">★</div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    {cheapest && (
                      <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                        Desde {cheapest}
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
                      {formatDate(ev.startsAt)}
                    </p>
                    <h3 className="font-display text-base font-bold leading-tight tracking-tight line-clamp-2">
                      {ev.title}
                    </h3>
                    <p className="flex items-center gap-1 text-xs text-white/60 line-clamp-1">
                      <MapPin className="size-3 shrink-0" />
                      {where}
                    </p>
                    <EventAforo sold={ev.sold} capacity={ev.capacity} compact className="pt-0.5" />
                  </div>
                </Link>
              );
            })}
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
