'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  AtSign,
  CheckCircle2,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  User,
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import { paths } from '@/core/config/paths';
import {
  promoterApplicationSchema,
  type PromoterApplicationInput,
  EXPERIENCE_VALUES,
  EXPERIENCE_LABELS,
  EVENT_TYPE_VALUES,
  EVENT_TYPE_LABELS,
  type EventTypeValue,
} from '../schemas/promoter-application.schema';
import {
  readSubmitErrorMessage,
  useSubmitPromoterApplication,
} from '../hooks/use-submit-promoter-application';

export function PromoterApplicationForm() {
  const { mutate, isPending, isSuccess, error, data } = useSubmitPromoterApplication();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PromoterApplicationInput>({
    resolver: zodResolver(promoterApplicationSchema),
    defaultValues: {
      applicant: { name: '', email: '' },
      promoter: {
        name: '',
        city: '',
        phone: '',
        instagram: '',
        website: '',
        experience: '0',
        eventTypes: [],
        message: '',
      },
    },
  });

  const onSubmit = handleSubmit((values) => mutate(values));

  if (isSuccess && data) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
          <CheckCircle2 className="size-7" />
        </div>
        <div className="space-y-2">
          <h3 className="font-display text-2xl font-bold tracking-[-0.02em]">
            ¡Recibimos tu solicitud!
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Nuestro equipo la va a revisar en las próximas 24-48 horas. Te avisamos por email tan
            pronto tengamos una respuesta.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-left">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
            ID de seguimiento
          </p>
          <code className="mt-1 block break-all font-mono text-xs text-foreground">
            {data.id}
          </code>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link href={paths.home}>Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-7">
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
        >
          {readSubmitErrorMessage(error)}
        </div>
      ) : null}

      <section className="space-y-4">
        <header className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
            Tus datos
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Te creamos una cuenta de panel automáticamente cuando aprobemos tu solicitud — la
            contraseña te llegará por email.
          </p>
        </header>
        <Field label="Nombre" htmlFor="applicant.name" error={errors.applicant?.name?.message}>
          <IconInput
            id="applicant.name"
            icon={User}
            autoComplete="name"
            placeholder="Tu nombre"
            {...register('applicant.name')}
          />
        </Field>
        <Field label="Email" htmlFor="applicant.email" error={errors.applicant?.email?.message}>
          <IconInput
            id="applicant.email"
            icon={Mail}
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            {...register('applicant.email')}
          />
        </Field>
      </section>

      <div className="border-t border-white/5" />

      <section className="space-y-4">
        <header className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
            Tu promotora
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Cuéntanos sobre tu marca o colectivo y dónde mueves eventos.
          </p>
        </header>
        <Field
          label="Nombre de la promotora"
          htmlFor="promoter.name"
          error={errors.promoter?.name?.message}
        >
          <IconInput
            id="promoter.name"
            icon={Megaphone}
            placeholder="Nombre o marca"
            {...register('promoter.name')}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ciudad" htmlFor="promoter.city" error={errors.promoter?.city?.message}>
            <IconInput
              id="promoter.city"
              icon={MapPin}
              placeholder="Cuernavaca"
              {...register('promoter.city')}
            />
          </Field>
          <Field
            label="Teléfono (opcional)"
            htmlFor="promoter.phone"
            error={errors.promoter?.phone?.message}
          >
            <IconInput
              id="promoter.phone"
              icon={Phone}
              placeholder="+52 777 000 0000"
              {...register('promoter.phone')}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Instagram (opcional)"
            htmlFor="promoter.instagram"
            error={errors.promoter?.instagram?.message}
          >
            <IconInput
              id="promoter.instagram"
              icon={AtSign}
              placeholder="@tu_promotora"
              {...register('promoter.instagram')}
            />
          </Field>
          <Field
            label="Sitio web (opcional)"
            htmlFor="promoter.website"
            error={errors.promoter?.website?.message}
          >
            <IconInput
              id="promoter.website"
              icon={Globe}
              placeholder="https://tu-sitio.com"
              {...register('promoter.website')}
            />
          </Field>
        </div>
      </section>

      <div className="border-t border-white/5" />

      <section className="space-y-4">
        <header className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
            Experiencia
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Cuántos eventos llevas y qué tipo de música mueves.
          </p>
        </header>

        <Field
          label="Eventos organizados"
          htmlFor="promoter.experience"
          error={errors.promoter?.experience?.message}
        >
          <select
            id="promoter.experience"
            className="flex h-11 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            {...register('promoter.experience')}
          >
            {EXPERIENCE_VALUES.map((value) => (
              <option key={value} value={value} className="bg-background text-foreground">
                {EXPERIENCE_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Tipos de evento"
          htmlFor="promoter.eventTypes"
          error={errors.promoter?.eventTypes?.message}
          description="Selecciona 1 o más (máximo 5)."
        >
          <Controller
            name="promoter.eventTypes"
            control={control}
            render={({ field }) => (
              <EventTypeChips
                value={field.value ?? []}
                onChange={(next) => field.onChange(next)}
              />
            )}
          />
        </Field>

        <Field
          label="Mensaje (opcional)"
          htmlFor="promoter.message"
          error={errors.promoter?.message?.message}
          description="Cuéntanos qué locales sueles usar, eventos destacados, alianzas, etc."
        >
          <textarea
            id="promoter.message"
            rows={3}
            className="flex w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            placeholder="Cuéntanos algo más sobre tu promotora…"
            {...register('promoter.message')}
          />
        </Field>
      </section>

      <div className="space-y-3 pt-2">
        <Button
          type="submit"
          size="lg"
          className="w-full rounded-full shadow-[0_10px_30px_-8px_rgba(168,85,247,0.65)]"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          {isPending ? 'Enviando…' : 'Enviar solicitud'}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Al enviar aceptas que NightPass se contacte contigo por email.
        </p>
      </div>
    </form>
  );
}

function EventTypeChips({
  value,
  onChange,
}: {
  value: EventTypeValue[];
  onChange: (next: EventTypeValue[]) => void;
}) {
  const toggle = (v: EventTypeValue) => {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
      return;
    }
    if (value.length >= 5) return;
    onChange([...value, v]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {EVENT_TYPE_VALUES.map((v) => {
        const selected = value.includes(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => toggle(v)}
            aria-pressed={selected}
            className={
              selected
                ? 'rounded-full border border-primary/60 bg-primary/15 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-[0_4px_18px_-8px_rgba(168,85,247,0.55)] transition'
                : 'rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-white/20 hover:bg-white/[0.06] hover:text-foreground'
            }
          >
            {EVENT_TYPE_LABELS[v]}
          </button>
        );
      })}
    </div>
  );
}

interface IconInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIconLike;
}

type LucideIconLike = React.ComponentType<{ className?: string }>;

const IconInput = React.forwardRef<HTMLInputElement, IconInputProps>(
  ({ icon: Icon, className, ...props }, ref) => (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input ref={ref} className={`h-11 pl-9 ${className ?? ''}`} {...props} />
    </div>
  ),
);
IconInput.displayName = 'IconInput';
