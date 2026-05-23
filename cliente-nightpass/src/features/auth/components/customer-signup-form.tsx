'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Check, Loader2, Lock, Mail, User as UserIcon } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import { signupSchema, type SignupInput } from '../schemas/signup.schema';
import { useCustomerSignup } from '../hooks/use-customer-signup';
import { OrDivider, SocialButtons } from './_social-buttons';
import { PasswordStrength } from './_password-strength';

interface CustomerSignupFormProps {
  onNameChange?: (name: string) => void;
}

export function CustomerSignupForm({ onNameChange }: CustomerSignupFormProps) {
  const { mutate, isPending } = useCustomerSignup();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => mutate(values));
  const nameValue = watch('name');
  const emailValue = watch('email');
  const passwordValue = watch('password');

  useEffect(() => {
    onNameChange?.(nameValue ?? '');
  }, [nameValue, onNameChange]);

  return (
    <div>
      <SocialButtons />
      <OrDivider />

      <form onSubmit={onSubmit} className="space-y-5">
        <div className={`np-rise transform-gpu ${errors.name ? 'np-shake' : ''}`} style={{ animationDelay: '40ms' }}>
          <Field label="Nombre" htmlFor="name" error={errors.name?.message}>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/40 transition-colors" />
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Tu nombre"
                className={`h-12 rounded-[12px] border-white/10 bg-white/[0.04] pl-10 pr-10 text-base transition-colors focus:border-primary/40 ${nameValue ? 'border-primary/40' : ''} ${errors.name ? 'border-destructive/60' : ''}`}
                {...register('name')}
              />
              {nameValue && (
                <Check className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-emerald-400 np-pop-in transform-gpu" />
              )}
            </div>
          </Field>
        </div>

        <div className={`np-rise transform-gpu ${errors.email ? 'np-shake' : ''}`} style={{ animationDelay: '100ms' }}>
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/40 transition-colors" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                className={`h-12 rounded-[12px] border-white/10 bg-white/[0.04] pl-10 pr-10 text-base transition-colors focus:border-primary/40 ${emailValue ? 'border-primary/40' : ''} ${errors.email ? 'border-destructive/60' : ''}`}
                {...register('email')}
              />
              {emailValue && !errors.email && (
                <Check className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-emerald-400 np-pop-in transform-gpu" />
              )}
            </div>
          </Field>
        </div>

        <div className={`np-rise transform-gpu ${errors.password ? 'np-shake' : ''}`} style={{ animationDelay: '160ms' }}>
          <Field label="Contraseña" htmlFor="password" error={errors.password?.message}>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/40 transition-colors" />
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                className={`h-12 rounded-[12px] border-white/10 bg-white/[0.04] pl-10 pr-3.5 text-base transition-colors focus:border-primary/40 ${passwordValue ? 'border-primary/40' : ''} ${errors.password ? 'border-destructive/60' : ''}`}
                {...register('password')}
              />
            </div>
            <PasswordStrength value={passwordValue ?? ''} />
          </Field>
        </div>

        <Button
          type="submit"
          size="lg"
          className={`mt-2 h-12 w-full rounded-[12px] bg-gradient-to-b from-[#a855f7] to-[#9333ea] text-[15px] font-bold text-white shadow-[0_14px_32px_-8px_rgba(168,85,247,0.6),inset_0_0_0_1px_rgba(255,255,255,0.1)] transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 transform-gpu np-rise ${isPending ? '' : 'np-shimmer'}`}
          style={{ animationDelay: '220ms' }}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Crear cuenta · es gratis
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>

        <p className="text-[11px] leading-[1.5] text-white/35 np-rise" style={{ animationDelay: '280ms' }}>
          Al crear tu cuenta aceptas los{' '}
          <a href="/terminos" className="text-white/65 underline-offset-2 transition-colors hover:underline hover:text-white/80">
            Términos
          </a>{' '}
          y la{' '}
          <a href="/privacidad" className="text-white/65 underline-offset-2 transition-colors hover:underline hover:text-white/80">
            Política de privacidad
          </a>{' '}
          de NightPass.
        </p>
      </form>
    </div>
  );
}
