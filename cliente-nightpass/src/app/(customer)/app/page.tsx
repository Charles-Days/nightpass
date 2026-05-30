import { Suspense } from 'react';
import { absoluteUrl } from '@/core/config/env';
import { InstallBanner, AppOpenPinger } from '@/features/geolocation';
import { SearchClient } from './buscar/_components/search-client';

const title = 'Antros — NightPass';
const description =
  'Descubre bares, antros, rooftops y lounges cerca de ti. Compra tu cover digital y entra sin filas con tu pase QR.';

export const metadata = {
  title,
  description,
  alternates: { canonical: '/app' },
  openGraph: { title, description, url: absoluteUrl('/app'), type: 'website' },
  twitter: { card: 'summary_large_image', title, description },
};

export default function AntrosPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-5 sm:px-8 sm:pb-7">
      <AppOpenPinger />
      <h1 className="sr-only">¿A qué antro vas esta noche?</h1>

      <Suspense>
        <SearchClient mode="venues" />
      </Suspense>

      <InstallBanner />
    </div>
  );
}
