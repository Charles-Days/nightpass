import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/components/ui/card';
import { Badge } from '@/core/components/ui/badge';
import { paths } from '@/core/config/paths';
import type { UserDetail as UserDetailType } from '@/core/types/api';
import { StatusBadge } from '@/features/venue-applications/components/status-badge';
import { RoleBadge } from './role-badge';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
}

export function UserDetail({ user, hideHeader = false }: { user: UserDetailType; hideHeader?: boolean }) {
  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-bold tracking-tight">
              {user.name ?? user.email}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <RoleBadge role={user.role} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identidad</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <Field label="Email" value={user.email} />
          <Field label="Nombre" value={user.name ?? '—'} />
          <Field label="Rol" value={user.role} />
          <Field label="Creado" value={fmtDate(user.createdAt)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Solicitudes</CardTitle>
        </CardHeader>
        <CardContent>
          {!user.applications || user.applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin solicitudes registradas.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {user.applications.map((app) => (
                <li
                  key={app.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-background/40 px-3 py-2"
                >
                  <Link
                    href={`${paths.adminApplications}/${app.id}`}
                    className="block flex-1 truncate"
                  >
                    <p className="font-medium">{app.venueName}</p>
                    <p className="text-xs text-muted-foreground">
                      {app.city} · {fmtDate(app.createdAt)}
                    </p>
                  </Link>
                  <StatusBadge status={app.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Locales que posee</CardTitle>
        </CardHeader>
        <CardContent>
          {!user.ownedVenues || user.ownedVenues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No es dueño de ningún local todavía.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {user.ownedVenues.map(({ venue }) => (
                <li
                  key={venue.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-background/40 px-3 py-2"
                >
                  <Link
                    href={`${paths.adminVenues}/${venue.id}`}
                    className="block flex-1 truncate"
                  >
                    <p className="font-medium">{venue.name}</p>
                    <p className="text-xs text-muted-foreground">{venue.city}</p>
                  </Link>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {venue.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {user.staffMemberships && user.staffMemberships.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Membresías de staff</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {user.staffMemberships.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 rounded-md border bg-background/40 px-3 py-2">
                  <Link href={`${paths.adminVenues}/${m.venueId}`} className="block flex-1 truncate">
                    <p className="font-medium">{m.venue.name}</p>
                  </Link>
                  <Badge variant="secondary">{m.staffRole}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground/80">{label}</p>
      <p className="mt-1 text-foreground">{value}</p>
    </div>
  );
}
