'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Instagram, Globe, Phone } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import { Textarea } from '@/core/components/ui/textarea';
import { ImageUploader } from '@/core/components/image-uploader';
import type { Promoter } from '@/core/types/api';
import {
  updatePromoterSchema,
  type UpdatePromoterInput,
} from '../schemas/promoter.schema';
import { useUpdatePromoter } from '../hooks/use-update-promoter';

interface Props {
  promoter: Promoter;
}

export function PromoterEditForm({ promoter }: Props) {
  const update = useUpdatePromoter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<UpdatePromoterInput>({
    resolver: zodResolver(updatePromoterSchema),
    defaultValues: {
      bio: promoter.bio ?? '',
      logoUrl: promoter.logoUrl ?? '',
      phone: promoter.phone ?? '',
      instagram: promoter.instagram ?? '',
      website: promoter.website ?? '',
    },
  });

  const onSubmit = handleSubmit((values) => {
    const payload: UpdatePromoterInput = {
      bio: values.bio ?? '',
      logoUrl: values.logoUrl ?? '',
      phone: values.phone ?? '',
      instagram: values.instagram ?? '',
      website: values.website ?? '',
    };
    update.mutate(payload);
  });

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-[22px] border border-white/10 bg-white/[0.025] p-6"
    >
      <Controller
        name="logoUrl"
        control={control}
        render={({ field }) => (
          <ImageUploader
            kind="venue"
            aspect="circle"
            value={field.value || undefined}
            onChange={(url) => field.onChange(url ?? '')}
            label="Logo del organizador"
            hint="Se muestra en círculo en tu perfil. Usa una imagen cuadrada y centrada (mín. 400×400) para que no se corte."
          />
        )}
      />

      <Field label="Bio" htmlFor="prom-bio" error={errors.bio?.message}>
        <Textarea
          id="prom-bio"
          rows={4}
          placeholder="Cuéntale a la gente quiénes son, qué tipo de eventos hacen…"
          {...register('bio')}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Teléfono" htmlFor="prom-phone" error={errors.phone?.message}>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="prom-phone"
              placeholder="+52 ..."
              className="pl-9"
              {...register('phone')}
            />
          </div>
        </Field>
        <Field
          label="Instagram"
          htmlFor="prom-instagram"
          error={errors.instagram?.message}
        >
          <div className="relative">
            <Instagram className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="prom-instagram"
              placeholder="@usuario"
              className="pl-9"
              {...register('instagram')}
            />
          </div>
        </Field>
      </div>

      <Field label="Sitio web" htmlFor="prom-website" error={errors.website?.message}>
        <div className="relative">
          <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="prom-website"
            placeholder="https://…"
            className="pl-9"
            {...register('website')}
          />
        </div>
      </Field>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={update.isPending || !isDirty}
          className="rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-6 font-semibold text-white shadow-lg shadow-primary/30"
        >
          {update.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {update.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}
