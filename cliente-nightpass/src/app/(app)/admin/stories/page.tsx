import { redirect } from 'next/navigation';
import { serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { User, PaginatedVenues } from '@/core/types/api';
import { AdminStoriesClient } from './admin-stories-client';

export const metadata = { title: 'Historias · NightPass Admin' };

export default async function AdminStoriesPage() {
  const user = await serverFetch<User>('/auth/me', { revalidate: 60 });
  if (user.role !== 'ADMIN') redirect(paths.dashboard);

  // Selector de locales activos (no se muta desde aquí) — cacheable.
  const data = await serverFetch<PaginatedVenues>('/venues?status=ACTIVE&limit=50', {
    revalidate: 120,
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Plataforma</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Historias</h1>
        <p className="text-sm text-muted-foreground">
          Sube y gestiona historias para cualquier local. Caducan a las 24h.
        </p>
      </header>
      <AdminStoriesClient venues={data.items} />
    </div>
  );
}
