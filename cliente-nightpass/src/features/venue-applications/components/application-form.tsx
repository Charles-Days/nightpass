'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Store,
  User,
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import { paths } from '@/core/config/paths';
import { applicationSchema, type ApplicationInput } from '../schemas/application.schema';
import { readSubmitErrorMessage, useSubmitApplication } from '../hooks/use-submit-application';

export function ApplicationForm() {
  const { mutate, isPending, isSuccess, error, data } = useSubmitApplication();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      applicant: { name: '', email: '' },
      venue: { name: '', city: '', address: '', phone: '', message: '' },
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
        <div className="rounded-xl border border-white/14 bg-white/[0.05] px-4 py-3 text-left">
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

      <div className="border-t border-white/10" />

      <section className="space-y-4">
        <header className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
            Tu local
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Cuéntanos sobre el lugar que quieres registrar.
          </p>
        </header>
        <Field label="Nombre del local" htmlFor="venue.name" error={errors.venue?.name?.message}>
          <IconInput
            id="venue.name"
            icon={Store}
            placeholder="Bar Lima"
            {...register('venue.name')}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ciudad" htmlFor="venue.city" error={errors.venue?.city?.message}>
            <IconInput
              id="venue.city"
              icon={MapPin}
              placeholder="Lima"
              {...register('venue.city')}
            />
          </Field>
          <Field
            label="Teléfono (opcional)"
            htmlFor="venue.phone"
            error={errors.venue?.phone?.message}
          >
            <IconInput
              id="venue.phone"
              icon={Phone}
              placeholder="+51 999 999 999"
              {...register('venue.phone')}
            />
          </Field>
        </div>
        <Field
          label="Dirección (opcional)"
          htmlFor="venue.address"
          error={errors.venue?.address?.message}
        >
          <IconInput
            id="venue.address"
            icon={MapPin}
            placeholder="Calle Larco 123"
            {...register('venue.address')}
          />
        </Field>
        <Field
          label="Mensaje (opcional)"
          htmlFor="venue.message"
          error={errors.venue?.message?.message}
          description="Capacidad, tipo de música, lo que quieras agregar."
        >
          <textarea
            id="venue.message"
            rows={3}
            className="flex w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            placeholder="Cuéntanos algo más sobre tu local…"
            {...register('venue.message')}
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
