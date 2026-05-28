import Link from 'next/link';
import {
  Calendar,
  Users,
  MapPin,
  CheckCircle2,
  PauseCircle,
  Plus,
  Pencil,
  Ticket,
} from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/core/components/ui/card';
import { paths } from '@/core/config/paths';
import type {
  PaginatedEvents,
  PromoterMe,
  PromoterStaffMember,
} from '@/core/types/api';

export const metadata = { title: 'Mi promotora' };

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  hint,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  href?: string;
  hint?: string;
}) {
  const inner = (
    <Card className="rounded-[22px] border border-white/10 bg-white/[0.025] transition-colors hover:bg-white/[0.04]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="size-4 text-primary/60" />
      </CardHeader>
      <CardContent>
        <p className="bg-gradient-to-br from-white to-purple-200 bg-clip-text font-display text-3xl font-bold text-transparent">
          {value}
        </p>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
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

export default async function MiPromotoraPage() {
  let me: PromoterMe;
  try {
    me = await serverFetch<PromoterMe>('/promoters/me');
  } catch (err) {
    if (err instanceof ServerApiError && err.status === 404) {
      return (
        <div className="space-y-6">
          <header className="space-y-1">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Mi promotora
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Sin promotora asignada
            </h1>
            <p className="text-sm text-muted-foreground">
              Tu cuenta de promotor aún no tiene una promotora vinculada.
              Contacta al administrador de NightPass.
            </p>
          </header>
        </div>
      );
    }
    throw err;
  }

  const promoter = me.promoter;
  const isActive = promoter.status === 'ACTIVE';

  // Eventos próximos + staff active (best-effort; no rompe el dashboard si fallan).
  const now = new Date().toISOString();
  const [eventsRes, staffRes] = await Promise.allSettled([
    serverFetch<PaginatedEvents>(
      `/events?status=PUBLISHED&fromDate=${encodeURIComponent(now)}&limit=100`,
    ),
    me.membershipRole === 'OWNER'
      ? serverFetch<PromoterStaffMember[]>('/promoters/me/staff')
      : Promise.resolve<PromoterStaffMember[]>([]),
  ]);

  const upcomingCount =
    eventsRes.status === 'fulfilled' ? eventsRes.value.items.length : 0;
  const staffCount = staffRes.status === 'fulfilled' ? staffRes.value.length : 0;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Mi promotora
        </p>
        <div className="flex items-start gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {promoter.name}
          </h1>
          {isActive ? (
            <span className="mt-1.5 flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-400">
              <CheckCircle2 className="size-3" />
              Activa
            </span>
          ) : (
            <span className="mt-1.5 flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
              <PauseCircle className="size-3" />
              Suspendida
            </span>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {promoter.city}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Próximos eventos"
          value={upcomingCount}
          icon={Calendar}
          href={paths.miPromotoraEventos}
        />
        <StatCard
          label="Staff activo"
          value={staffCount}
          icon={Users}
          href={me.membershipRole === 'OWNER' ? paths.miPromotoraStaff : undefined}
        />
        <StatCard
          label="Pases vendidos"
          value="—"
          icon={Ticket}
          hint="Próximamente"
        />
      </section>

      <Card className="rounded-[22px] border border-white/10 bg-white/[0.025]">
        <CardHeader>
          <CardTitle className="text-base">Acciones rápidas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          <Link
            href={paths.miPromotoraEventosNuevo}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-4 py-1.5 font-semibold text-white shadow-lg shadow-primary/30 transition-opacity hover:opacity-90"
          >
            <Plus className="size-3.5" />
            Crear evento
          </Link>
          {me.membershipRole === 'OWNER' ? (
            <Link
              href={paths.miPromotoraEditar}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-4 py-1.5 font-medium text-primary transition-colors hover:bg-primary/25"
            >
              <Pencil className="size-3.5" />
              Editar perfil
            </Link>
          ) : null}
          <Link
            href={paths.miPromotoraEventos}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-accent-foreground"
          >
            <Calendar className="size-3.5" />
            Ver eventos
          </Link>
        </CardContent>
      </Card>

      {promoter.bio ? (
        <Card className="rounded-[22px] border border-white/10 bg-white/[0.025]">
          <CardHeader>
            <CardTitle className="text-base">Sobre la promotora</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground/80">
            <p className="whitespace-pre-line">{promoter.bio}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
