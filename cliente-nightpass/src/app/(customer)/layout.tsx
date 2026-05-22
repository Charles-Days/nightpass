import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import type { User } from '@/core/types/api';
import { TopBar } from './_components/top-bar';
import { BottomNav } from './_components/bottom-nav';
import { CustomerBokeh } from './_components/customer-bokeh';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  let user: User | null = null;
  try {
    user = await serverFetch<User>('/auth/me');
  } catch (error) {
    if (!(error instanceof ServerApiError) || (error.status !== 401 && error.status !== 403)) {
      throw error;
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <CustomerBokeh />
      <TopBar user={user} />
      <main className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-12">{children}</main>
      <BottomNav />
    </div>
  );
}
