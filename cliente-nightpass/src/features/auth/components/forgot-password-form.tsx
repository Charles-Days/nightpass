'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from '../schemas/forgot-password.schema';
import { useForgotPassword } from '../hooks/use-forgot-password';

export function ForgotPasswordForm() {
  const { mutate, isPending, isSuccess } = useForgotPassword();
  const [submittedEmail, setSubmittedEmail] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit((values) => {
    mutate(values, {
      onSuccess: () => setSubmittedEmail(values.email),
    });
  });

  if (isSuccess && submittedEmail) {
    return (
      <div className="space-y-4 rounded-2xl border border-primary/25 bg-primary/5 px-5 py-6 np-pop-in transform-gpu">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary np-success-pop transform-gpu" />
          <div className="space-y-1.5">
            <p className="font-display text-base font-semibold">Revisa tu correo</p>
            <p className="text-sm text-muted-foreground">
              Si <span className="font-medium text-foreground/80">{submittedEmail}</span> está
              registrado, te enviamos un link para restablecer tu contraseña. El link expira en 60 minutos.
            </p>
            <p className="pt-2 text-xs text-muted-foreground">
              ¿No te llegó? Revisa spam o intenta de nuevo en unos minutos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className={errors.email ? 'np-shake transform-gpu' : ''}>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              className={`h-12 pl-9 text-base transition-colors ${errors.email ? 'border-destructive/60' : ''}`}
              {...register('email')}
            />
          </div>
        </Field>
      </div>

      <Button
        type="submit"
        size="lg"
        className={`h-12 w-full rounded-full shadow-[0_10px_30px_-8px_rgba(168,85,247,0.65)] transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 transform-gpu ${isPending ? '' : 'np-shimmer'}`}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
        {isPending ? 'Enviando…' : 'Enviar link de recuperación'}
      </Button>
    </form>
  );
}
