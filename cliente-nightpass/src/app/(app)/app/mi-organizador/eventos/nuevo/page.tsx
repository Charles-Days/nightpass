import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { PromoterMe } from '@/core/types/api';
import { PromoterEventCreate } from '@/features/promoters';

export const metadata = { title: 'Nuevo evento' };

export default async function NuevoEventoPage() {
  let me: PromoterMe;
  try {
    me = await serverFetch<PromoterMe>('/promoters/me', { revalidate: 300 });
  } catch (err) {
    if (err instanceof ServerApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href={paths.miOrganizadorEventos}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver a eventos
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Nuevo evento
        </h1>
        <p className="text-sm text-muted-foreground">
          Crea un evento para {me.promoter.name}.
        </p>
      </header>

      <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-6">
        <PromoterEventCreate promoterId={me.promoter.id} />
      </div>
    </div>
  );
}
