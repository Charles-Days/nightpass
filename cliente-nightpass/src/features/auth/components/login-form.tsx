'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2, Lock, Mail } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import { paths } from '@/core/config/paths';
import { loginSchema, type LoginInput } from '../schemas/login.schema';
import { useLogin } from '../hooks/use-login';

export function LoginForm() {
  const { mutate, isPending } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => mutate(values));

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            className="h-11 pl-9"
            {...register('email')}
          />
        </div>
      </Field>

      <Field label="Contraseña" htmlFor="password" error={errors.password?.message}>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-11 pl-9"
            {...register('password')}
          />
        </div>
        <div className="flex justify-end pt-0.5">
          <Link
            href={paths.forgotPassword}
            className="text-xs text-muted-foreground transition hover:text-primary"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </Field>

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
        {isPending ? 'Ingresando…' : 'Ingresar al panel'}
      </Button>
    </form>
  );
}
