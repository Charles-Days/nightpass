'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
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
    <div className="mt-6">
      <div className="relative">
        <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Bar, ciudad, género…"
          className="h-12 rounded-full border-white/15 bg-white/[0.04] pl-11 text-sm"
        />
      </div>

      {categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
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
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                category === c
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.07] hover:text-foreground'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Buscando…</p>
        ) : data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No encontramos resultados. Prueba con otra búsqueda.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((v) => (
              <VenueCard key={v.id} venue={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
