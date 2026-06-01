import { redirect } from 'next/navigation';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { User } from '@/core/types/api';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user: User;
  try {
    user = await serverFetch<User>('/auth/me', { revalidate: 60 });
  } catch (error) {
    if (error instanceof ServerApiError && (error.status === 401 || error.status === 403)) {
      redirect(paths.login);
    }
    throw error;
  }

  if (user.role !== 'ADMIN') {
    redirect(paths.dashboard);
  }

  return <>{children}</>;
}
