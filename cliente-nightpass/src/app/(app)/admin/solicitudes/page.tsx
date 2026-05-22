import Link from 'next/link';
import { serverFetch } from '@/core/lib/api/server-client';
import type { ApplicationStatus, PaginatedApplications } from '@/core/types/api';
import { ApplicationsTable } from '@/features/venue-applications/components/applications-table';

export const metadata = { title: 'Solicitudes de locales' };

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

const STATUS_FILTERS: { value: ApplicationStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'APPROVED', label: 'Aprobadas' },
  { value: 'REJECTED', label: 'Rechazadas' },
  { value: 'ALL', label: 'Todas' },
];

export default async function ApplicationsListPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const filter = (status as ApplicationStatus | 'ALL' | undefined) ?? 'PENDING';
  const queryString = filter === 'ALL' ? '' : `?status=${filter}`;
  const data = await serverFetch<PaginatedApplications>(`/venue-applications${queryString}`);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Solicitudes</h1>
        <p className="text-sm text-muted-foreground">
          Revisa y aprueba los locales que quieren registrarse en NightPass.
        </p>
      </header>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <nav className="flex flex-nowrap gap-2 border-b pb-2 sm:flex-wrap">
          {STATUS_FILTERS.map((s) => {
            const active = filter === s.value;
            return (
              <Link
                key={s.value}
                href={s.value === 'ALL' ? '/admin/solicitudes' : `/admin/solicitudes?status=${s.value}`}
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

      <ApplicationsTable data={data} />

      <p className="text-xs text-muted-foreground">
        {data.total} solicitudes · página {data.page}
      </p>
    </div>
  );
}
