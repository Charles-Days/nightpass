import Link from 'next/link';
import { serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { PaginatedVenues, VenueStatus } from '@/core/types/api';
import { VenueTable } from '@/features/venues';

export const metadata = { title: 'Locales' };

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}

const STATUS_FILTERS: { value: VenueStatus | 'ALL'; label: string }[] = [
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'SUSPENDED', label: 'Suspendidos' },
  { value: 'ALL', label: 'Todos' },
];

export default async function VenuesListPage({ searchParams }: PageProps) {
  const { status, search, page } = await searchParams;
  const filter = (status as VenueStatus | 'ALL' | undefined) ?? 'ACTIVE';

  const qs = new URLSearchParams();
  if (filter !== 'ALL') qs.set('status', filter);
  if (search) qs.set('search', search);
  if (page) qs.set('page', page);
  const queryString = qs.toString() ? `?${qs.toString()}` : '';

  const data = await serverFetch<PaginatedVenues>(`/venues${queryString}`);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">Locales</h1>
        <p className="text-sm text-muted-foreground">
          Todos los locales registrados en NightPass.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 border-b pb-2">
        {STATUS_FILTERS.map((s) => {
          const active = filter === s.value;
          const params = new URLSearchParams();
          if (s.value !== 'ALL') params.set('status', s.value);
          if (search) params.set('search', search);
          const href = params.toString()
            ? `${paths.adminVenues}?${params.toString()}`
            : paths.adminVenues;
          return (
            <Link
              key={s.value}
              href={href}
              className={
                active
                  ? 'rounded-md bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary'
                  : 'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }
            >
              {s.label}
            </Link>
          );
        })}
      </nav>

      <VenueTable data={data} />

      <p className="text-xs text-muted-foreground">
        {data.total} locales · página {data.page}
      </p>
    </div>
  );
}
