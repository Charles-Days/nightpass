import { serverFetch } from '@/core/lib/api/server-client';
import type { User } from '@/core/types/api';
import { OnboardingGate } from '@/features/geolocation';

export default async function CustomerAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layout NUNCA debe tirar — error.tsx hermano no atrapa errores de layout,
  // se cae a global-error.tsx → fallback Pages Router 500. Degradamos
  // cualquier fallo (401/403/network/5xx/parse) a user=null y dejamos que
  // las paginas hijas decidan que hacer (redirect a login si necesitan auth).
  let user: User | null = null;
  try {
    user = await serverFetch<User>('/auth/me');
  } catch {
    user = null;
  }

  return (
    <>
      <OnboardingGate user={user} />
      {children}
    </>
  );
}
