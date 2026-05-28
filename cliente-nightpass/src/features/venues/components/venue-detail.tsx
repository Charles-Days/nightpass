'use client';

import * as React from 'react';
import Link from 'next/link';
import { Loader2, Pause, Play, Star, X } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/components/ui/card';
import { ConfirmDialog } from '@/core/components/ui/confirm-dialog';
import { FeatureDialog } from '@/core/components/feature-dialog';
import { paths } from '@/core/config/paths';
import type { Venue } from '@/core/types/api';
import { useSuspendVenue } from '../hooks/use-suspend-venue';
import { useReactivateVenue } from '../hooks/use-reactivate-venue';
import { useFeatureVenue } from '../hooks/use-feature-venue';
import { useSetVenuePlatformFee } from '../hooks/use-set-platform-fee';
import { Input } from '@/core/components/ui/input';
import { useRemoveOwner } from '../hooks/use-assign-owner';
import { VenueEditForm } from './venue-edit-form';
import { CheckinQrPanel } from './checkin-qr-panel';
import { VenueStatusBadge } from './status-badge';
import { AssignOwnerDialog } from './assign-owner-dialog';
import { RoleBadge } from '@/features/users';
import { StaffTable, InviteStaffForm } from '@/features/staff';
import { EventsPanel } from '@/features/events';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
}

function OwnerRow({
  venueId,
  user,
}: {
  venueId: string;
  user: { id: string; email: string; name: string | null; role: import('@/core/types/api').Role };
}) {
  const remove = useRemoveOwner(venueId);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border bg-background/40 px-3 py-2">
      <Link href={`${paths.adminUsers}/${user.id}`} className="block min-w-0 flex-1 truncate">
        <p className="font-medium">{user.name ?? user.email}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </Link>
      <RoleBadge role={user.role} />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="size-7 p-0 text-muted-foreground hover:text-destructive"
        title="Remover como dueño"
        onClick={() => setConfirmOpen(true)}
        disabled={remove.isPending}
      >
        {remove.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="¿Quitar dueño?"
        description={`${user.name ?? user.email} dejará de gestionar este local.`}
        confirmLabel="Sí, quitar"
        cancelLabel="Cancelar"
        variant="destructive"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(user.id, { onSettled: () => setConfirmOpen(false) })}
      />
    </li>
  );
}

export function VenueDetail({ venue, hideHeader = false }: { venue: Venue; hideHeader?: boolean }) {
  const suspend = useSuspendVenue(venue.id);
  const reactivate = useReactivateVenue(venue.id);
  const feature = useFeatureVenue(venue.id);
  const setFee = useSetVenuePlatformFee(venue.id);
  const [feeInput, setFeeInput] = React.useState<string>(
    String(venue.platformFeePct ?? 0),
  );
  const [featureDialogOpen, setFeatureDialogOpen] = React.useState(false);
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Dueños</CardTitle>
          <AssignOwnerDialog venueId={venue.id} venueName={venue.name} />
        </CardHeader>
        <CardContent>
          {!venue.owners || venue.owners.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin dueños asignados. Usa el botón <strong>Asignar dueño</strong> para
              vincular este local a un usuario (existente o nuevo).
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {venue.owners.map(({ user }) => (
                <OwnerRow key={user.id} venueId={venue.id} user={user} />
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
          <CardTitle className="text-base">Destacado en primera plana</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {venue.isFeatured
              ? 'Este local aparece primero en el catálogo público.'
              : 'Activa para fijar este local arriba en el catálogo público.'}
          </p>
          {venue.isFeatured && venue.featuredReason ? (
            <p className="rounded-md border border-amber-300/25 bg-amber-300/5 px-3 py-2 text-xs text-amber-100/80">
              Motivo interno: {venue.featuredReason}
            </p>
          ) : null}
          <Button
            type="button"
            variant={venue.isFeatured ? 'secondary' : 'default'}
            disabled={feature.isPending}
            onClick={() => {
              if (venue.isFeatured) {
                feature.mutate({ featured: false });
              } else {
                setFeatureDialogOpen(true);
              }
            }}
          >
            {feature.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Star className={`size-4 ${venue.isFeatured ? 'fill-amber-300 text-amber-300' : ''}`} />
            )}
            {venue.isFeatured ? 'Quitar destacado' : 'Destacar en primera plana'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comisión NightPass</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            % que NightPass retiene sobre cada entrada vendida. Se descuenta antes del payout al local.
          </p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Porcentaje (%)
              </p>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
              />
            </div>
            <Button
              type="button"
              disabled={
                setFee.isPending ||
                isNaN(Number(feeInput)) ||
                Number(feeInput) < 0 ||
                Number(feeInput) > 100
              }
              onClick={() => setFee.mutate(Number(feeInput))}
            >
              {setFee.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Guardar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Actual: <span className="font-semibold text-foreground">{venue.platformFeePct ?? 0}%</span>
          </p>
        </CardContent>
      </Card>

      <FeatureDialog
        open={featureDialogOpen}
        onOpenChange={setFeatureDialogOpen}
        title={`Destacar ${venue.name}`}
        description="Aparecerá primero en el catálogo público. El motivo es interno (solo admin lo ve)."
        isPending={feature.isPending}
        onConfirm={(reason) => {
          feature.mutate(
            { featured: true, reason },
            { onSettled: () => setFeatureDialogOpen(false) },
          );
        }}
      />

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
          <CardTitle className="text-base">Check-in QR</CardTitle>
        </CardHeader>
        <CardContent>
          <CheckinQrPanel
            venueId={venue.id}
            venueName={venue.name}
            venueCity={venue.city}
          />
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
