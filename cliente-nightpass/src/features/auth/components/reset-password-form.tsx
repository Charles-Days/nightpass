'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Field } from '@/core/components/ui/field';
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from '../schemas/reset-password.schema';
import { useResetPassword } from '../hooks/use-reset-password';
import { PasswordStrength } from './_password-strength';
import { PasswordChecklist } from './_password-checklist';
import { PasswordInput } from './_password-input';

interface ResetPasswordFormProps {
  token: string;
  variant?: 'admin' | 'customer';
}

export function ResetPasswordForm({ token, variant = 'admin' }: ResetPasswordFormProps) {
  const { mutate, isPending } = useResetPassword({ variant });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onTouched',
    defaultValues: { token, newPassword: '', confirmPassword: '' },
  });

  const newPasswordValue = watch('newPassword');

  const onSubmit = handleSubmit((values) => {
    mutate({ token: values.token, newPassword: values.newPassword });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" {...register('token')} />

      <div className={errors.newPassword ? 'np-shake transform-gpu' : ''}>
        <Field
          label="Nueva contraseña"
          htmlFor="newPassword"
          error={errors.newPassword?.message}
        >
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            placeholder="••••••••"
            className={`h-12 text-base transition-colors ${errors.newPassword ? 'border-destructive/60' : ''}`}
            {...register('newPassword')}
          />
          <PasswordStrength value={newPasswordValue ?? ''} />
          <PasswordChecklist value={newPasswordValue ?? ''} />
        </Field>
      </div>

      <div className={errors.confirmPassword ? 'np-shake transform-gpu' : ''}>
        <Field
          label="Confirmar contraseña"
          htmlFor="confirmPassword"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="••••••••"
            className={`h-12 text-base transition-colors ${errors.confirmPassword ? 'border-destructive/60' : ''}`}
            {...register('confirmPassword')}
          />
        </Field>
      </div>

      <Button
        type="submit"
        size="lg"
        className={`h-12 w-full rounded-full shadow-[0_10px_30px_-8px_rgba(168,85,247,0.65)] transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 transform-gpu ${isPending ? '' : 'np-shimmer'}`}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
        {isPending ? 'Actualizando…' : 'Cambiar contraseña'}
      </Button>
    </form>
  );
}
