'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import type { Venue } from '@/core/types/api';
import { updateVenueSchema, type UpdateVenueInput } from '../schemas/venue.schema';
import { useUpdateVenue } from '../hooks/use-update-venue';

export function VenueEditForm({ venue }: { venue: Venue }) {
  const update = useUpdateVenue(venue.id);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<UpdateVenueInput>({
    resolver: zodResolver(updateVenueSchema),
    defaultValues: {
      name: venue.name,
      city: venue.city,
      address: venue.address ?? '',
      phone: venue.phone ?? '',
    },
  });

  const onSubmit = handleSubmit((values) => {
    update.mutate(values, {
      onSuccess: () => reset(values),
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Nombre" htmlFor="name" error={errors.name?.message}>
        <Input id="name" {...register('name')} />
      </Field>
      <Field label="Ciudad" htmlFor="city" error={errors.city?.message}>
        <Input id="city" {...register('city')} />
      </Field>
      <Field label="Dirección" htmlFor="address" error={errors.address?.message}>
        <Input id="address" {...register('address')} />
      </Field>
      <Field label="Teléfono" htmlFor="phone" error={errors.phone?.message}>
        <Input id="phone" {...register('phone')} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={!isDirty || update.isPending}>
          {update.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {update.isPending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}
