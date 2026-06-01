import { redirect } from 'next/navigation';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { User, PromoterMe } from '@/core/types/api';
import { AppShell } from './_components/app-shell';

export const metadata = { robots: { index: false, follow: false } };

type VenueLite = { id: string; name: string };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user: User;
  try {
    user = await serverFetch<User>('/auth/me', { revalidate: 60 });
  } catch (error) {
    if (error instanceof ServerApiError) {
      if (error.status === 401 || error.status === 403 || error.isNetwork || error.status >= 500) {
        redirect(paths.login);
      }
    }
    throw error;
  }

  if (user.role === 'CUSTOMER') {
    redirect(`/api/auth/logout?next=${encodeURIComponent('/login?reason=customer-blocked')}`);
  }

  let contextName: string | null = null;
  if (user.role === 'VENUE_OWNER' || user.role === 'VENUE_STAFF') {
    try {
      const venues = await serverFetch<VenueLite[]>('/venues/my', { revalidate: 300 });
      contextName = venues[0]?.name ?? null;
    } catch {
      contextName = null;
    }
  } else if (user.role === 'PROMOTER' || user.role === 'PROMOTER_STAFF') {
    try {
      const me = await serverFetch<PromoterMe>('/promoters/me', { revalidate: 300 });
      contextName = me.promoter?.name ?? null;
    } catch {
      contextName = null;
    }
  }

  return <AppShell user={user} contextName={contextName}>{children}</AppShell>;
}
