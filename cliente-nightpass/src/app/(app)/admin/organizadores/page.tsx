import Link from 'next/link';
import { serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { PaginatedPromoters, PromoterStatus } from '@/core/types/api';
import { AdminPromoterTable } from '@/features/promoters';

export const metadata = { title: 'Organizadores' };

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}

const STATUS_FILTERS: { value: PromoterStatus | 'ALL'; label: string }[] = [
  { value: 'ACTIVE', label: 'Activas' },
  { value: 'SUSPENDED', label: 'Suspendidas' },
  { value: 'ALL', label: 'Todas' },
];

export default async function PromotorasListPage({ searchParams }: PageProps) {
  const { status, search, page } = await searchParams;
  const filter = (status as PromoterStatus | 'ALL' | undefined) ?? 'ACTIVE';

  const qs = new URLSearchParams();
  if (filter !== 'ALL') qs.set('status', filter);
  if (search) qs.set('search', search);
  if (page) qs.set('page', page);
  const queryString = qs.toString() ? `?${qs.toString()}` : '';

  const data = await serverFetch<PaginatedPromoters>(
    `/promoters${queryString}`,
  );

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Organizadores
          </h1>
          <p className="text-sm text-muted-foreground">
            Todos los organizadores registrados en NightPass.
          </p>
        </div>
      </header>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <nav className="flex flex-nowrap gap-2 border-b pb-2 sm:flex-wrap">
          {STATUS_FILTERS.map((s) => {
            const active = filter === s.value;
            const params = new URLSearchParams();
            if (s.value !== 'ALL') params.set('status', s.value);
            if (search) params.set('search', search);
            const href = params.toString()
              ? `${paths.adminOrganizadores}?${params.toString()}`
              : paths.adminOrganizadores;
            return (
              <Link
                key={s.value}
                href={href}
                className={
                  active
                    ? 'rounded-md bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary transition-colors duration-200'
                    : 'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground'
                }
              >
                {s.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <AdminPromoterTable data={data} />

      <p className="text-xs text-muted-foreground">
        {data.total} organizadores · página {data.page}
      </p>
    </div>
  );
}
