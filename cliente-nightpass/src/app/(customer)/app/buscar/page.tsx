import { SearchClient } from './_components/search-client';

export const metadata = {
  title: 'Buscar bares — NightPass',
  description: 'Encuentra el bar perfecto por ciudad, género musical o categoría.',
};

export default function BuscarPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-10">
      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Buscar</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
        Encuentra tu próximo spot
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Busca por nombre, ciudad o filtra por categoría.
      </p>
      <SearchClient />
    </div>
  );
}
