import { SearchClient } from './_components/search-client';

export const metadata = {
  title: 'Buscar bares — NightPass',
  description: 'Encuentra el bar perfecto por ciudad, género musical o categoría.',
};

export default function BuscarPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-10">
      <p className="np-rise text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Buscar</p>
      <h1 className="np-rise mt-2 font-display text-3xl font-bold tracking-tight" style={{ animationDelay: '80ms' }}>
        Encuentra tu próximo spot
      </h1>
      <p className="np-rise mt-2 text-sm text-muted-foreground" style={{ animationDelay: '160ms' }}>
        Busca por nombre, ciudad o filtra por categoría.
      </p>
      <SearchClient />
    </div>
  );
}
