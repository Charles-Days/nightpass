'use client';

import * as React from 'react';
import type { Venue } from '@/core/types/api';
import type { VenueInput } from '../schemas/venue.schema';
import { useUpdateVenue } from '../hooks/use-update-venue';
import { VenueForm } from './venue-form';

export function VenueEditForm({ venue }: { venue: Venue }) {
  const update = useUpdateVenue(venue.id);

  const initialData: Partial<VenueInput> = {
    name: venue.name,
    city: venue.city,
    address: venue.address ?? '',
    phone: venue.phone ?? '',
    description: venue.description ?? '',
    capacity: venue.capacity ?? undefined,
    priceFromCents: venue.priceFromCents ?? undefined,
    currency: venue.currency ?? '',
    latitude: venue.latitude ?? undefined,
    longitude: venue.longitude ?? undefined,
    coverImageUrl: venue.coverImageUrl ?? '',
    categories: venue.categories ?? [],
    openHours: (venue.openHours as any) ?? undefined,
    menuUrl: venue.menuUrl ?? '',
    musicTypes: venue.musicTypes ?? [],
    socialLinks: (venue.socialLinks as any) ?? undefined,
    dressCode: venue.dressCode ?? '',
    minAge: venue.minAge ?? undefined,
    status: venue.status,
    images: venue.photos?.map((p) => p.url) ?? [],
  };

  return (
    <VenueForm
      initialData={initialData}
      isPending={update.isPending}
      onSubmit={(values) => update.mutate(values)}
      submitLabel="Guardar cambios"
    />
  );
}
