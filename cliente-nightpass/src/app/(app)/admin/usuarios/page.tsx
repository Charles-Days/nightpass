import Link from 'next/link';
import { serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { PaginatedUsers, Role } from '@/core/types/api';
import { UserTable, UsersSearchFilter } from '@/features/users';

export const metadata = { title: 'Usuarios' };

interface PageProps {
  searchParams: Promise<{ role?: string; search?: string; page?: string }>;
}

const ROLE_FILTERS: { value: Role | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'ADMIN', label: 'Admins' },
  { value: 'VENUE_OWNER', label: 'Dueños' },
  { value: 'VENUE_STAFF', label: 'Staff' },
  { value: 'CUSTOMER', label: 'Clientes' },
];

export default async function UsersListPage({ searchParams }: PageProps) {
  const { role, search, page } = await searchParams;
  const filter = (role as Role | 'ALL' | undefined) ?? 'ALL';

  const qs = new URLSearchParams();
  if (filter !== 'ALL') qs.set('role', filter);
  if (search) qs.set('search', search);
  if (page) qs.set('page', page);
  const queryString = qs.toString() ? `?${qs.toString()}` : '';

  const data = await serverFetch<PaginatedUsers>(`/users${queryString}`);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Todos los usuarios del sistema (clientes, dueños, staff y admins).
        </p>
      </header>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <nav className="flex flex-nowrap gap-2 border-b pb-2 sm:flex-wrap">
          {ROLE_FILTERS.map((r) => {
            const active = filter === r.value;
            const params = new URLSearchParams();
            if (r.value !== 'ALL') params.set('role', r.value);
            if (search) params.set('search', search);
            const href = params.toString()
              ? `${paths.adminUsers}?${params.toString()}`
              : paths.adminUsers;
            return (
              <Link
                key={r.value}
                href={href}
                className={
                  active
                    ? 'rounded-md bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary transition-colors duration-200'
                    : 'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground'
                }
              >
                {r.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <UsersSearchFilter />

      <UserTable data={data} />

      <p className="text-xs text-muted-foreground">
        {data.total} usuarios · página {data.page}
      </p>
    </div>
  );
}
