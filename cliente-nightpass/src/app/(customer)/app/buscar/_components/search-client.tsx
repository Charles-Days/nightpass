'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Loader2, MapPin, Search, Sparkles } from 'lucide-react';
import { clientFetch } from '@/core/lib/api/client-client';
import { Input } from '@/core/components/ui/input';
import { paths } from '@/core/config/paths';
import { VenueCard } from '../../../_components/venue-card';
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
}

interface EventsResponse {
  items: EventFeed[];
  total: number;
}

type Tab = 'venues' | 'events';

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

export function SearchClient() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const initialTab: Tab = (searchParams.get('tab') as Tab) === 'events' ? 'events' : 'venues';

  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState(initialQ);
  const [category, setCategory] = useState<string | null>(null);
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
  }, [query, category, tab]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    venues.forEach((v) => v.categories?.forEach((c) => set.add(c)));
    return Array.from(set).slice(0, 8);
  }, [venues]);

  return (
    <div className="np-rise mt-6" style={{ animationDelay: '220ms' }}>
      {/* Tabs */}
      <div className="mb-5 inline-flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
        <button
          type="button"
          onClick={() => setTab('venues')}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
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
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
            tab === 'events'
              ? 'bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)]'
              : 'text-white/65 hover:text-white'
          }`}
        >
          Eventos
        </button>
      </div>

      <div className="group relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tab === 'venues' ? 'Bar, ciudad, género…' : 'Evento, organizador, ciudad…'}
          className="h-12 rounded-full border-white/15 bg-white/[0.04] pl-11 pr-11 text-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        {loading && query.trim().length > 0 ? (
          <Loader2
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-primary"
          />
        ) : null}
      </div>

      {tab === 'venues' && categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`transform-gpu rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
              category === null
                ? 'border-primary/40 bg-primary/15 text-primary'
                : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.07] hover:text-foreground'
            }`}
          >
            Todos
          </button>
          {categories.map((c, i) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c === category ? null : c)}
              className={`np-rise transform-gpu rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-all duration-200 active:scale-95 ${
                category === c
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.07] hover:text-foreground'
              }`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {venues.map((v, i) => (
                <div key={v.id} className="np-rise" style={{ animationDelay: `${i * 60}ms` }}>
                  <VenueCard venue={v} />
                </div>
              ))}
            </div>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((ev, i) => {
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
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
