import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';
import type { Event, PromoterMe } from '@/core/types/api';
import { PromoterEventEdit } from '@/features/promoters';

export const metadata = { title: 'Editar evento' };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EventoDetallePage({ params }: PageProps) {
  const { id } = await params;

  let me: PromoterMe;
  let event: Event;
  try {
    [me, event] = await Promise.all([
      // Identidad/nombre del organizador: estable, cacheable.
      serverFetch<PromoterMe>('/promoters/me', { revalidate: 300 }),
      // El evento se edita en esta misma vista (PromoterEventEdit hace
      // router.refresh tras guardar) → debe ser fresco. Mantener no-store.
      serverFetch<Event>(`/events/${id}`),
    ]);
  } catch (err) {
    if (err instanceof ServerApiError && (err.status === 404 || err.status === 403)) {
      notFound();
    }
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
          {event.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          Evento de {me.promoter.name}.
        </p>
      </header>

      <div className="rounded-[22px] border border-white/14 bg-white/[0.05] p-6">
        <PromoterEventEdit promoterId={me.promoter.id} eventId={id} />
      </div>
    </div>
  );
}
