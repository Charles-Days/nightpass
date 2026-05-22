import Link from 'next/link';
import { Search } from 'lucide-react';
import { serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import { VenueCard } from '../_components/venue-card';
import type { CatalogVenueSummary } from '@/core/types/api';

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

export default async function CustomerHomePage() {
  let venues: CatalogVenueSummary[] = [];
  try {
    const data = await serverFetch<CatalogResponse>('/catalog/venues?limit=24');
    venues = data.items ?? [];
  } catch {
    venues = [];
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      {/* Hero */}
      <section className="mb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Vive la noche · Sin filas
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-[0.95] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
          Descubre dónde
          <br />
          <span className="font-serif italic text-purple-200">sales esta noche</span>
        </h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
          Compra tu cover digital con QR seguro y entra al toque. Sin efectivo, sin tickets.
        </p>

        <Link
          href={paths.buscar}
          className="mt-7 inline-flex w-full max-w-md items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3.5 text-sm text-white/60 transition hover:border-white/25 hover:bg-white/[0.06]"
        >
          <Search className="size-4" />
          Buscar un bar, ciudad o género…
        </Link>
      </section>

      {/* Grid */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight">Bares cerca de ti</h2>
          <Link
            href={paths.buscar}
            className="text-xs font-semibold uppercase tracking-[0.18em] text-primary hover:text-primary/80"
          >
            Ver todos
          </Link>
        </div>

        {venues.length === 0 ? (
          <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Aún no hay bares disponibles. Vuelve más tarde.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((v) => (
              <VenueCard key={v.id} venue={v} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
