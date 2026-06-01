import { redirect } from 'next/navigation';
import { serverFetch } from '@/core/lib/api/server-client';
import type { Story, User, Venue } from '@/core/types/api';
import { paths } from '@/core/config/paths';
import { StoriesManager } from '@/features/stories-admin';

export const metadata = { title: 'Historias · NightPass Admin' };

export default async function MiLocalStoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ compose?: string; return?: string }>;
}) {
  const { compose, return: returnParam } = await searchParams;
  const autoStart: 'record' | 'photo' | null =
    compose === 'record' ? 'record' : compose === 'photo' ? 'photo' : null;
  const returnTo = returnParam === 'app' || returnParam === 'profile' ? returnParam : null;
  const user = await serverFetch<User>('/auth/me', { revalidate: 60 });
  if (user.role === 'ADMIN') {
    redirect(paths.adminStories);
  }
  if (!['VENUE_OWNER', 'VENUE_STAFF'].includes(user.role)) {
    redirect(paths.dashboard);
  }
  const venues = await serverFetch<Venue[]>('/venues/my', { revalidate: 300 });
  const venue = venues[0];
  if (!venue) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Mi local
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Historias</h1>
        </header>
        <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-10 text-center text-sm text-muted-foreground">
          Aún no tienes un local asignado.
        </div>
      </div>
    );
  }
  const initialStories = await serverFetch<Story[]>(`/stories/mine?venueId=${venue.id}`);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Mi local
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">Historias</h1>
        <p className="text-sm text-muted-foreground">
          Comparte momentos del local. Las historias se borran solas a las 24h.
        </p>
      </header>
      <StoriesManager
        target={{ venueId: venue.id }}
        title={venue.name}
        initialStories={initialStories}
        autoStart={autoStart}
        returnTo={returnTo}
      />
    </div>
  );
}
