'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { clientFetch } from '@/core/lib/api/client-client';
import type { PaginatedPromoters, PaginatedVenues } from '@/core/types/api';
import { RewardsManager } from '@/features/rewards-admin';

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

type OwnerType = 'PROMOTER' | 'VENUE';

function usePromotersList() {
  return useQuery({
    queryKey: ['admin-recompensas-promoters'],
    queryFn: () =>
      clientFetch<PaginatedPromoters>('/api/promoters?status=ACTIVE&limit=200'),
  });
}

function useVenuesList() {
  return useQuery({
    queryKey: ['admin-recompensas-venues'],
    queryFn: () =>
      clientFetch<PaginatedVenues>('/api/venues?status=ACTIVE&limit=200'),
  });
}

export default function AdminRecompensasPage() {
  const [ownerType, setOwnerType] = React.useState<OwnerType>('PROMOTER');
  const [ownerId, setOwnerId] = React.useState('');

  const promoters = usePromotersList();
  const venues = useVenuesList();

  const loadingOptions =
    ownerType === 'PROMOTER' ? promoters.isLoading : venues.isLoading;

  const options =
    ownerType === 'PROMOTER'
      ? (promoters.data?.items ?? []).map((p) => ({
          id: p.id,
          label: `${p.name} · ${p.city}`,
        }))
      : (venues.data?.items ?? []).map((v) => ({
          id: v.id,
          label: `${v.name} · ${v.city}`,
        }));

  const handleOwnerTypeChange = (value: OwnerType) => {
    setOwnerType(value);
    setOwnerId('');
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary sm:text-[11px]">
          Plataforma
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Recompensas
        </h1>
        <p className="text-sm text-muted-foreground">
          Crea y gestiona promos de cualquier organizador o local.
        </p>
      </header>

      <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="owner-type"
              className="text-xs font-medium text-muted-foreground"
            >
              Tipo de dueño
            </label>
            <select
              id="owner-type"
              className={SELECT_CLASS}
              value={ownerType}
              onChange={(e) => handleOwnerTypeChange(e.target.value as OwnerType)}
            >
              <option value="PROMOTER">Organizador</option>
              <option value="VENUE">Local</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="owner-id"
              className="text-xs font-medium text-muted-foreground"
            >
              {ownerType === 'PROMOTER' ? 'Organizador' : 'Local'}
            </label>
            <select
              id="owner-id"
              className={SELECT_CLASS}
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              disabled={loadingOptions}
            >
              <option value="">
                {loadingOptions
                  ? 'Cargando…'
                  : ownerType === 'PROMOTER'
                    ? 'Selecciona un organizador'
                    : 'Selecciona un local'}
              </option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {ownerId ? (
        <div className="rounded-[22px] border border-white/14 bg-white/[0.05] p-6">
          {ownerType === 'PROMOTER' ? (
            <RewardsManager key={`promoter-${ownerId}`} promoterId={ownerId} />
          ) : (
            <RewardsManager key={`venue-${ownerId}`} venueId={ownerId} />
          )}
        </div>
      ) : (
        <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-8 text-center text-sm text-muted-foreground">
          {loadingOptions ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-primary" />
              Cargando opciones…
            </span>
          ) : (
            `Selecciona un ${ownerType === 'PROMOTER' ? 'organizador' : 'local'} para gestionar sus recompensas.`
          )}
        </div>
      )}
    </div>
  );
}
