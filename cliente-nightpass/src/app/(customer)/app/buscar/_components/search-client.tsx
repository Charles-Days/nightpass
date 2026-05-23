'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { clientFetch } from '@/core/lib/api/client-client';
import { Input } from '@/core/components/ui/input';
import { VenueCard } from '../../../_components/venue-card';
import type { CatalogVenueSummary } from '@/core/types/api';

interface CatalogResponse {
  items: CatalogVenueSummary[];
  total: number;
  page: number;
  limit: number;
}

export function SearchClient() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [data, setData] = useState<CatalogVenueSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set('limit', '30');
        if (query.trim()) params.set('search', query.trim());
        if (category) params.set('category', category);
        const res = await clientFetch<CatalogResponse>(`/api/catalog/venues?${params.toString()}`);
        if (!cancelled) setData(res.items ?? []);
      } catch {
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, category]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    data.forEach((v) => v.categories?.forEach((c) => set.add(c)));
    return Array.from(set).slice(0, 8);
  }, [data]);

  return (
    <div className="np-rise mt-6" style={{ animationDelay: '220ms' }}>
      <div className="group relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Bar, ciudad, género…"
          className="h-12 rounded-full border-white/15 bg-white/[0.04] pl-11 pr-11 text-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        {loading && query.trim().length > 0 ? (
          <Loader2
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-primary"
          />
        ) : null}
      </div>

      {categories.length > 0 && (
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
        {loading && data.length === 0 ? (
          <div className="np-fade-in flex flex-col items-center justify-center gap-3 py-12 text-center text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span>Buscando…</span>
          </div>
        ) : data.length === 0 ? (
          <p className="np-fade-in py-12 text-center text-sm text-muted-foreground">
            No encontramos resultados. Prueba con otra búsqueda.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((v, i) => (
              <div
                key={v.id}
                className="np-rise"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <VenueCard venue={v} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
