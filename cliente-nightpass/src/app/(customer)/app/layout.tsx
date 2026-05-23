import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import type { User } from '@/core/types/api';
import { OnboardingGate } from '@/features/geolocation';

export default async function CustomerAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: User | null = null;
  try {
    user = await serverFetch<User>('/auth/me');
  } catch (error) {
    if (!(error instanceof ServerApiError) || (error.status !== 401 && error.status !== 403)) {
      throw error;
    }
  }

  return (
    <>
      <OnboardingGate user={user} />
      {children}
    </>
  );
}
