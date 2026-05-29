'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import { ImageUploader } from '@/core/components/image-uploader';
import { DateTimePicker } from '@/core/components/ui/datetime-picker';
import { createEventSchema, type CreateEventInput } from '../schemas/event.schema';
import { useCreateEvent } from '../hooks/use-create-event';
import { useUpdateEvent } from '../hooks/use-update-event';
import { TiersSection } from './tiers-section';

interface EventFormProps {
  venueId: string;
  onSuccess?: () => void;
  defaultValues?: Partial<CreateEventInput>;
  eventId?: string;
  /** Renderiza la sección de tiers al pie del form. Default true. El admin la
   *  pone en false porque ya muestra los tiers en una card aparte. */
  showTiers?: boolean;
}

export function EventForm({
  venueId,
  onSuccess,
  defaultValues,
  eventId,
  showTiers = true,
}: EventFormProps) {
  const create = useCreateEvent(venueId);
  const update = useUpdateEvent(venueId);
  const isPending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: '',
      description: '',
      startsAt: '',
      endsAt: '',
      coverImageUrl: '',
      flyerImageUrl: '',
      status: 'DRAFT',
      ...defaultValues,
    },
  });

  const onSubmit = handleSubmit((values) => {
    const payload = {
      ...values,
      description: values.description || undefined,
      coverImageUrl: values.coverImageUrl || undefined,
      flyerImageUrl: values.flyerImageUrl || undefined,
    };
    if (eventId) {
      update.mutate({ id: eventId, ...payload }, { onSuccess: () => onSuccess?.() });
    } else {
      create.mutate({ venueId, ...payload }, { onSuccess: () => onSuccess?.() });
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Título" htmlFor="ev-title" error={errors.title?.message}>
        <Input id="ev-title" placeholder="Nombre del evento" {...register('title')} />
      </Field>

      <Field label="Descripción" htmlFor="ev-description" error={errors.description?.message}>
        <textarea
          id="ev-description"
          rows={3}
          placeholder="Descripción opcional…"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
          {...register('description')}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Inicio" htmlFor="ev-starts-at" error={errors.startsAt?.message}>
          <Controller
            name="startsAt"
            control={control}
            render={({ field }) => (
              <DateTimePicker
                id="ev-starts-at"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>

        <Field label="Fin" htmlFor="ev-ends-at" error={errors.endsAt?.message}>
          <Controller
            name="endsAt"
            control={control}
            render={({ field }) => (
              <DateTimePicker
                id="ev-ends-at"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Estado" htmlFor="ev-status" error={errors.status?.message}>
          <select
            id="ev-status"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            {...register('status')}
          >
            <option value="DRAFT">Borrador</option>
            <option value="PUBLISHED">Publicado</option>
            <option value="CANCELED">Cancelado</option>
          </select>
        </Field>

        <Field label="Capacidad" htmlFor="ev-capacity" error={errors.capacity?.message}>
          <Input
            id="ev-capacity"
            type="number"
            min={1}
            placeholder="Sin límite"
            {...register('capacity')}
          />
        </Field>
      </div>

      <Controller
        name="coverImageUrl"
        control={control}
        render={({ field }) => (
          <ImageUploader
            kind="event"
            value={field.value || undefined}
            onChange={(url) => field.onChange(url ?? '')}
            label="Portada del evento"
            hint="Horizontal 16:9 — recomendado 1600×900 px. Se recorta a 16:9."
            aspect="video"
          />
        )}
      />

      <Controller
        name="flyerImageUrl"
        control={control}
        render={({ field }) => (
          <ImageUploader
            kind="event"
            value={field.value || undefined}
            onChange={(url) => field.onChange(url ?? '')}
            label="Flyer del evento (vertical)"
            hint="Vertical 9:16 — recomendado 1080×1920 px. Se muestra completa."
            aspect="portrait"
          />
        )}
      />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
        <Button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full shadow-lg shadow-primary/30 sm:w-auto"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isPending ? 'Guardando…' : eventId ? 'Guardar cambios' : 'Crear evento'}
        </Button>
      </div>

      {eventId && showTiers ? <TiersSection eventId={eventId} /> : null}
    </form>
  );
}
