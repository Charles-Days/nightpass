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
    // 401/403 → invitado. Red caída / 5xx → degradamos a invitado en vez de 500.
    if (
      !(error instanceof ServerApiError) ||
      (error.status !== 401 && error.status !== 403 && !error.isNetwork && error.status < 500)
    ) {
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
