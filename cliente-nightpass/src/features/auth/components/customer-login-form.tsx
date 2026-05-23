'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2, Lock, Mail } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import { paths } from '@/core/config/paths';
import { loginSchema, type LoginInput } from '../schemas/login.schema';
import { useCustomerLogin } from '../hooks/use-customer-login';
import { OrDivider, SocialButtons } from './_social-buttons';

export function CustomerLoginForm() {
  const { mutate, isPending } = useCustomerLogin();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => mutate(values));
  const emailValue = watch('email');
  const passwordValue = watch('password');

  return (
    <div>
      <SocialButtons />
      <OrDivider />

      <form onSubmit={onSubmit} className="space-y-5">
        <div className={`np-rise transform-gpu ${errors.email ? 'np-shake' : ''}`} style={{ animationDelay: '40ms' }}>
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/40 transition-colors" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                className={`h-12 rounded-[12px] border-white/10 bg-white/[0.04] pl-10 text-base transition-colors focus:border-primary/40 ${emailValue ? 'border-primary/40' : ''} ${errors.email ? 'border-destructive/60' : ''}`}
                {...register('email')}
              />
            </div>
          </Field>
        </div>

        <div className={`np-rise transform-gpu ${errors.password ? 'np-shake' : ''}`} style={{ animationDelay: '100ms' }}>
          <Field label="Contraseña" htmlFor="password" error={errors.password?.message}>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/40 transition-colors" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className={`h-12 rounded-[12px] border-white/10 bg-white/[0.04] pl-10 text-base transition-colors focus:border-primary/40 ${passwordValue ? 'border-primary/40' : ''} ${errors.password ? 'border-destructive/60' : ''}`}
                {...register('password')}
              />
            </div>
            <div className="flex justify-end pt-1">
              <Link
                href={paths.recuperarPassword}
                className="text-[11px] text-white/45 transition-colors hover:text-primary active:scale-95 inline-block transform-gpu"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </Field>
        </div>

        <Button
          type="submit"
          size="lg"
          className={`mt-2 h-12 w-full rounded-[12px] bg-gradient-to-b from-[#a855f7] to-[#9333ea] text-[15px] font-bold text-white shadow-[0_14px_32px_-8px_rgba(168,85,247,0.6),inset_0_0_0_1px_rgba(255,255,255,0.1)] transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 transform-gpu np-rise ${isPending ? '' : 'np-shimmer'}`}
          style={{ animationDelay: '160ms' }}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Entrar
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
