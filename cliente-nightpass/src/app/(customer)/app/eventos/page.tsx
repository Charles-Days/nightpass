import { Suspense } from 'react';
import { absoluteUrl } from '@/core/config/env';
import { SearchClient } from '../buscar/_components/search-client';

const title = 'Eventos — NightPass';
const description =
  'Encuentra eventos, fiestas y line-ups cerca de ti. Compra tu pase con QR y entra sin filas.';

export const metadata = {
  title,
  description,
  alternates: { canonical: '/app/eventos' },
  openGraph: { title, description, url: absoluteUrl('/app/eventos'), type: 'website' },
  twitter: { card: 'summary_large_image', title, description },
};

export default function EventosPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-5 sm:px-8 sm:pb-7">
      <h1 className="sr-only">¿Qué eventos hay esta semana?</h1>

      <Suspense>
        <SearchClient mode="events" />
      </Suspense>
    </div>
  );
}
