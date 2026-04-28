import { redirect } from 'next/navigation';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { User } from '@/core/types/api';
import { AppShell } from './_components/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user: User;
  try {
    user = await serverFetch<User>('/auth/me');
  } catch (error) {
    if (error instanceof ServerApiError && (error.status === 401 || error.status === 403)) {
      redirect(paths.login);
    }
    throw error;
  }

  if (user.role === 'CUSTOMER') {
    redirect(`/api/auth/logout?next=${encodeURIComponent('/login?reason=customer-blocked')}`);
  }

  return <AppShell user={user}>{children}</AppShell>;
}
