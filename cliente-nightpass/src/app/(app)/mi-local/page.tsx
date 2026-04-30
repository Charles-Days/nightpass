import Link from 'next/link';
import { Calendar, Users, MapPin, CheckCircle2, PauseCircle } from 'lucide-react';
import { serverFetch } from '@/core/lib/api/server-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/components/ui/card';
import { paths } from '@/core/config/paths';
import type { Venue } from '@/core/types/api';

export const metadata = { title: 'Mi local' };

/** Backend devuelve _count con events y staff activos para /venues/my */
type VenueWithCount = Venue & {
  _count: { events: number; staff: number };
};

function StatCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  href?: string;
}) {
  const inner = (
    <Card className="rounded-[22px] border border-white/10 bg-white/[0.025] transition-colors hover:bg-white/[0.04]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-primary/60" />
      </CardHeader>
      <CardContent>
        <p className="bg-gradient-to-br from-white to-purple-200 bg-clip-text font-display text-3xl font-bold text-transparent">
          {value}
        </p>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

export default async function MiLocalPage() {
  const venues = await serverFetch<VenueWithCount[]>('/venues/my');
  const venue = venues[0] as VenueWithCount | undefined;

  if (!venue) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Mi local
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Sin local asignado</h1>
          <p className="text-sm text-muted-foreground">
            Tu cuenta de dueño aún no tiene un local vinculado. Contacta al administrador de
            NightPass.
          </p>
        </header>
      </div>
    );
  }

  const isActive = venue.status === 'ACTIVE';

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Mi local
        </p>
        <div className="flex items-start gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight">{venue.name}</h1>
          {isActive ? (
            <span className="mt-1.5 flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-400">
              <CheckCircle2 className="size-3" />
              Activo
            </span>
          ) : (
            <span className="mt-1.5 flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
              <PauseCircle className="size-3" />
              Suspendido
            </span>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {venue.city}
          {venue.address ? ` · ${venue.address}` : ''}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Eventos"
          value={venue._count.events}
          icon={Calendar}
          href={paths.miLocalEventos}
        />
        <StatCard
          label="Staff activo"
          value={venue._count.staff}
          icon={Users}
          href={paths.miLocalStaff}
        />
        <StatCard
          label="Estado"
          value={isActive ? 'Activo' : 'Suspendido'}
          icon={isActive ? CheckCircle2 : PauseCircle}
        />
      </section>

      <Card className="rounded-[22px] border border-white/10 bg-white/[0.025]">
        <CardHeader>
          <CardTitle className="text-base">Detalles del local</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Slug</p>
              <code className="text-xs text-foreground/80">{venue.slug}</code>
            </div>
            {venue.phone && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Teléfono
                </p>
                <p className="text-foreground/80">{venue.phone}</p>
              </div>
            )}
            {venue.description && (
              <div className="sm:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Descripción
                </p>
                <p className="text-foreground/80">{venue.description}</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-3 border-t border-white/5 pt-4">
            <Link
              href={paths.miLocalEditar}
              className="rounded-full bg-primary/15 px-4 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/25"
            >
              Editar información
            </Link>
            <Link
              href={paths.miLocalEventos}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-accent-foreground"
            >
              Ver eventos
            </Link>
            <Link
              href={paths.miLocalStaff}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-accent-foreground"
            >
              Gestionar staff
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
