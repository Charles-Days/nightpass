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
    <div className="mx-auto w-full max-w-5xl px-5 py-5 sm:px-8 sm:py-7">
      <InstallBanner />
      <AppOpenPinger />

      <h1
        className="np-rise font-display text-2xl font-bold tracking-tight sm:text-3xl"
        style={{ animationDelay: '0ms' }}
      >
        ¿A qué <span className="font-serif italic font-normal text-purple-200">antro</span> vas
        esta noche?
      </h1>

      <Suspense>
        <SearchClient mode="venues" />
      </Suspense>
    </div>
  );
}
