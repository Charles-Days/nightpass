import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { RETURNING_COOKIE } from '@/core/config/cookies';
import type { User } from '@/core/types/api';
import { TopBar } from './_components/top-bar';
import { BottomNav } from './_components/bottom-nav';
import { CustomerBokeh } from './_components/customer-bokeh';
import { SWRegister } from './_components/sw-register';
import { NoPinchZoom } from './_components/no-pinch-zoom';
import { VisitTracker } from '@/core/components/visit-tracker';
import { EnableNotificationsBanner } from '@/features/push';

export const metadata: Metadata = {
  title: 'NightPass',
  description: 'Tu pase a la noche.',
  manifest: '/manifest.webmanifest',
  applicationName: 'NightPass',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NightPass',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  let user: User | null = null;
  try {
    user = await serverFetch<User>('/auth/me');
  } catch (error) {
    // 401/403 → sin sesión (normal). Red caída/timeout (status 0) → degradamos
    // a invitado en vez de 500. Cualquier otro 5xx también se trata como
    // "sesión no disponible" para no romper toda la shell customer.
    if (
      !(error instanceof ServerApiError) ||
      (error.status !== 401 && error.status !== 403 && !error.isNetwork && error.status < 500)
    ) {
      throw error;
    }
  }

  // Visitante que ya tuvo cuenta en este dispositivo → el header lo invita a
  // "Iniciar sesión" en vez de "Crear cuenta". Solo decide UI, no es auth.
  const isReturning = (await cookies()).get(RETURNING_COOKIE)?.value === '1';

  return (
    <div className="relative flex min-h-dvh flex-col">
      <SWRegister />
      <NoPinchZoom />
      <VisitTracker />
      <CustomerBokeh />
      <TopBar user={user} isReturning={isReturning} />
      {user ? <EnableNotificationsBanner /> : null}
      <main className="flex-1 pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-12">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
