'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Loader2, Lock } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';

const schema = z
  .object({
    oldPassword: z.string().min(1, 'Requerido'),
    newPassword: z
      .string()
      .min(10, 'La nueva contraseña debe tener al menos 10 caracteres')
      .max(128)
      .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
      .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
      .regex(/[0-9]/, 'Debe incluir al menos un número'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type FormInput = z.infer<typeof schema>;

export function ChangePasswordForm() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) =>
      clientFetch<{ ok: boolean }>('/api/auth/change-password', {
        method: 'POST',
        body: { oldPassword, newPassword },
      }),
    onSuccess: () => {
      toast.success('Contraseña cambiada correctamente');
      router.push('/dashboard');
      router.refresh();
    },
    onError: (err) => {
      if (err instanceof ClientApiError && err.status === 401) {
        toast.error('Contraseña actual incorrecta');
      } else if (err instanceof ClientApiError && err.status === 400) {
        const raw = (err.payload as { message?: string | string[] })?.message;
        const msg = Array.isArray(raw) ? raw[0] : raw;
        toast.error(msg || 'La nueva contraseña no cumple los requisitos');
      } else {
        toast.error('No pudimos cambiar la contraseña');
      }
    },
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(({ oldPassword, newPassword }) =>
    mutation.mutate({ oldPassword, newPassword }),
  );

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Contraseña actual" htmlFor="old-password" error={errors.oldPassword?.message}>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="old-password" type="password" autoComplete="current-password" placeholder="••••••••" className="h-11 pl-9" {...register('oldPassword')} />
        </div>
      </Field>
      <Field label="Nueva contraseña" htmlFor="new-password" error={errors.newPassword?.message}>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="new-password" type="password" autoComplete="new-password" placeholder="••••••••" className="h-11 pl-9" {...register('newPassword')} />
        </div>
      </Field>
      <Field label="Confirmar contraseña" htmlFor="confirm-password" error={errors.confirmPassword?.message}>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="confirm-password" type="password" autoComplete="new-password" placeholder="••••••••" className="h-11 pl-9" {...register('confirmPassword')} />
        </div>
      </Field>
      <Button
        type="submit"
        size="lg"
        className="w-full rounded-full shadow-[0_10px_30px_-8px_rgba(168,85,247,0.65)]"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
        {mutation.isPending ? 'Guardando…' : 'Cambiar contraseña'}
      </Button>
    </form>
  );
}
