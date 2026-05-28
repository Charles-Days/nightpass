import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { PromoterMe } from '@/core/types/api';
import { PromoterEditForm } from '@/features/promoters';

export const metadata = { title: 'Editar promotora' };

export default async function MiPromotoraEditarPage() {
  let me: PromoterMe;
  try {
    me = await serverFetch<PromoterMe>('/promoters/me');
  } catch (err) {
    if (err instanceof ServerApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href={paths.miPromotora}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver a mi promotora
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Editar perfil
        </h1>
        <p className="text-sm text-muted-foreground">
          Actualiza la presentación pública de {me.promoter.name}.
        </p>
      </header>

      <PromoterEditForm promoter={me.promoter} />
    </div>
  );
}
