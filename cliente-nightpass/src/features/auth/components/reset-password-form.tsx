'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2, Lock } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from '../schemas/reset-password.schema';
import { useResetPassword } from '../hooks/use-reset-password';

interface ResetPasswordFormProps {
  token: string;
  variant?: 'admin' | 'customer';
}

export function ResetPasswordForm({ token, variant = 'admin' }: ResetPasswordFormProps) {
  const { mutate, isPending } = useResetPassword({ variant });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit((values) => {
    mutate({ token: values.token, newPassword: values.newPassword });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" {...register('token')} />

      <Field
        label="Nueva contraseña"
        htmlFor="newPassword"
        error={errors.newPassword?.message}
        description="Mínimo 8 caracteres"
      >
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className="h-11 pl-9"
            {...register('newPassword')}
          />
        </div>
      </Field>

      <Field
        label="Confirmar contraseña"
        htmlFor="confirmPassword"
        error={errors.confirmPassword?.message}
      >
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className="h-11 pl-9"
            {...register('confirmPassword')}
          />
        </div>
      </Field>

      <Button
        type="submit"
        size="lg"
        className="w-full rounded-full shadow-[0_10px_30px_-8px_rgba(168,85,247,0.65)]"
        disabled={isPending}
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
        {isPending ? 'Actualizando…' : 'Cambiar contraseña'}
      </Button>
    </form>
  );
}
