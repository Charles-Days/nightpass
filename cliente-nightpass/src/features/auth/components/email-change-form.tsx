'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Lock, Mail, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import { ClientApiError } from '@/core/lib/api/client-client';
import { emailChangeSchema, type EmailChangeInput } from '../schemas/account.schema';
import { useRequestEmailChange } from '../hooks/use-request-email-change';

export function EmailChangeForm({ currentEmail }: { currentEmail: string }) {
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm<EmailChangeInput>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: { newEmail: '', currentPassword: '' },
  });

  const { mutate, isPending } = useRequestEmailChange({
    onSuccess: () => {
      setSentTo(getValues('newEmail'));
      reset({ newEmail: '', currentPassword: '' });
      toast.success('Te enviamos un correo de confirmación');
    },
  });

  const onSubmit = handleSubmit((values) =>
    mutate(values, {
      onError: (err) => {
        if (err instanceof ClientApiError && err.status === 401) {
          toast.error('Contraseña incorrecta');
        } else if (err instanceof ClientApiError && err.status === 409) {
          toast.error('Ese correo ya está en uso');
        } else if (err instanceof ClientApiError && err.status === 400) {
          const raw = (err.payload as { message?: string | string[] })?.message;
          const msg = Array.isArray(raw) ? raw[0] : raw;
          toast.error(msg || 'No pudimos procesar el cambio');
        } else {
          toast.error('No pudimos enviar la confirmación');
        }
      },
    }),
  );

  if (sentTo) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-[18px] border border-primary/30 bg-primary/10 px-4 py-3.5 text-sm">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">Revisa tu nuevo correo</p>
            <p className="text-muted-foreground">
              Enviamos un link de confirmación a{' '}
              <span className="font-medium text-foreground">{sentTo}</span>. Tu correo
              actual seguirá activo hasta que lo confirmes. El link expira en 60 minutos.
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setSentTo(null)}>
          Cambiar a otro correo
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Correo actual" htmlFor="current-email">
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="current-email"
            value={currentEmail}
            disabled
            className="h-11 pl-9 opacity-70"
          />
        </div>
      </Field>
      <Field label="Nuevo correo" htmlFor="new-email" error={errors.newEmail?.message}>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="new-email"
            type="email"
            autoComplete="email"
            placeholder="nuevo@correo.com"
            className="h-11 pl-9"
            {...register('newEmail')}
          />
        </div>
      </Field>
      <Field
        label="Tu contraseña"
        htmlFor="email-change-password"
        error={errors.currentPassword?.message}
        description="Confirma tu identidad para cambiar el correo"
      >
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email-change-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-11 pl-9"
            {...register('currentPassword')}
          />
        </div>
      </Field>
      <Button type="submit" disabled={isPending} className="rounded-full">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
        {isPending ? 'Enviando…' : 'Enviar confirmación'}
      </Button>
    </form>
  );
}
