import { AdminEventsView } from '@/features/events';

export const metadata = { title: 'Eventos' };

export default function AdminEventosPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Plataforma
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Eventos
        </h1>
        <p className="text-sm text-muted-foreground">
          Todos los eventos de la plataforma. Edita, destaca o elimina cualquiera.
        </p>
      </header>

      <AdminEventsView />
    </div>
  );
}
