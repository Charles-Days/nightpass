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
        <h1 className="font-display text-3xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Todos los usuarios del sistema (clientes, dueños, staff y admins).
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 border-b pb-2">
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
                  ? 'rounded-md bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary'
                  : 'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }
            >
              {r.label}
            </Link>
          );
        })}
      </nav>

      <UsersSearchFilter />

      <UserTable data={data} />

      <p className="text-xs text-muted-foreground">
        {data.total} usuarios · página {data.page}
      </p>
    </div>
  );
}
