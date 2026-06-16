import { Suspense } from 'react';
import { absoluteUrl } from '@/core/config/env';
import { SearchClient } from '../buscar/_components/search-client';
import BuscarLoading from '../buscar/loading';

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
    <div className="mx-auto w-full max-w-5xl px-5 pb-5 pt-8 sm:px-8 sm:pb-7 sm:pt-9">
      <h1
        className="np-rise font-display text-2xl font-bold tracking-tight sm:text-3xl"
        style={{ animationDelay: '0ms' }}
      >
        ¿Qué <span className="font-serif italic font-normal text-purple-200">eventos</span> hay
        esta semana?
      </h1>

      <Suspense fallback={<BuscarLoading />}>
        <SearchClient mode="events" />
      </Suspense>
    </div>
  );
}
