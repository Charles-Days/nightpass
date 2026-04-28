'use client';

import * as React from 'react';
import Link from 'next/link';
import { Loader2, Pause, Play } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/components/ui/card';
import { paths } from '@/core/config/paths';
import type { Venue } from '@/core/types/api';
import { useSuspendVenue } from '../hooks/use-suspend-venue';
import { useReactivateVenue } from '../hooks/use-reactivate-venue';
import { VenueEditForm } from './venue-edit-form';
import { VenueStatusBadge } from './status-badge';
import { RoleBadge } from '@/features/users';
import { StaffTable, InviteStaffForm } from '@/features/staff';
import { EventsPanel } from '@/features/events';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
}

export function VenueDetail({ venue, hideHeader = false }: { venue: Venue; hideHeader?: boolean }) {
  const suspend = useSuspendVenue(venue.id);
  const reactivate = useReactivateVenue(venue.id);
  const isMutating = suspend.isPending || reactivate.isPending;

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-bold tracking-tight">{venue.name}</h1>
            <p className="text-sm text-muted-foreground">
              {venue.city} · slug: <code className="rounded bg-muted px-1">{venue.slug}</code>
            </p>
          </div>
          <VenueStatusBadge status={venue.status} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información del local</CardTitle>
        </CardHeader>
        <CardContent>
          <VenueEditForm venue={venue} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dueños</CardTitle>
        </CardHeader>
        <CardContent>
          {!venue.owners || venue.owners.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin dueños asignados.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {venue.owners.map(({ user }) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-background/40 px-3 py-2"
                >
                  <Link
                    href={`${paths.adminUsers}/${user.id}`}
                    className="block flex-1 truncate"
                  >
                    <p className="font-medium">{user.name ?? user.email}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </Link>
                  <RoleBadge role={user.role} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado del local</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Última actualización: {fmtDate(venue.updatedAt)}
          </p>
          {venue.status === 'ACTIVE' ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => suspend.mutate()}
              disabled={isMutating}
            >
              {suspend.isPending ? <Loader2 className="size-4 animate-spin" /> : <Pause className="size-4" />}
              Suspender local
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => reactivate.mutate()}
              disabled={isMutating}
            >
              {reactivate.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Reactivar local
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Suspender oculta el local del feed público; reactivar lo vuelve a publicar.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipo del local</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="mb-4 text-sm font-medium">Invitar nuevo miembro</p>
            <InviteStaffForm venueId={venue.id} />
          </div>
          <div className="border-t border-white/5 pt-4">
            <p className="mb-3 text-sm font-medium">Miembros actuales</p>
            <StaffTable venueId={venue.id} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <EventsPanel venueId={venue.id} />
        </CardContent>
      </Card>
    </div>
  );
}
