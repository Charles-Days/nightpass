import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/core/components/ui/card';
import { serverFetch } from '@/core/lib/api/server-client';
import type { User } from '@/core/types/api';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await serverFetch<User>('/auth/me');

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Panel de gestión</p>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Bienvenido, {user.name ?? user.email}
        </h1>
        <p className="text-sm text-muted-foreground">
          Panel de administracion de NightPass · Fase inicial
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[22px] border border-white/10 bg-white/[0.025] transition-colors hover:bg-white/[0.04]">
          <CardHeader>
            <CardTitle>Locales</CardTitle>
            <CardDescription>Bares y discos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="bg-gradient-to-br from-white to-purple-200 bg-clip-text font-display text-3xl font-bold text-transparent">—</p>
            <p className="mt-1 text-xs text-muted-foreground">Modulo backend pendiente</p>
          </CardContent>
        </Card>

        <Card className="rounded-[22px] border border-white/10 bg-white/[0.025] transition-colors hover:bg-white/[0.04]">
          <CardHeader>
            <CardTitle>Eventos activos</CardTitle>
            <CardDescription>Programados en los proximos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="bg-gradient-to-br from-white to-purple-200 bg-clip-text font-display text-3xl font-bold text-transparent">—</p>
            <p className="mt-1 text-xs text-muted-foreground">Modulo backend pendiente</p>
          </CardContent>
        </Card>

        <Card className="rounded-[22px] border border-white/10 bg-white/[0.025] transition-colors hover:bg-white/[0.04]">
          <CardHeader>
            <CardTitle>Pases vendidos</CardTitle>
            <CardDescription>Total de la semana</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="bg-gradient-to-br from-white to-purple-200 bg-clip-text font-display text-3xl font-bold text-transparent">—</p>
            <p className="mt-1 text-xs text-muted-foreground">Modulo backend pendiente</p>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-[22px] border border-white/10 bg-white/[0.025]">
        <CardHeader>
          <CardTitle>Estado del backend</CardTitle>
          <CardDescription>Conectado correctamente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Email:</span> {user.email}
          </p>
          <p>
            <span className="text-muted-foreground">User ID:</span>{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{user.id}</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
