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

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nombre" htmlFor="name" error={errors.name?.message}>
          <div className="relative">
            <UserIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/40" />
            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Tu nombre"
              className={`h-12 rounded-[12px] border-white/10 bg-white/[0.04] pl-10 pr-10 transition focus:border-primary/40 ${nameValue ? 'border-primary/40' : ''}`}
              {...register('name')}
            />
            {nameValue && (
              <Check className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-emerald-400" />
            )}
          </div>
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/40" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              className={`h-12 rounded-[12px] border-white/10 bg-white/[0.04] pl-10 pr-10 transition focus:border-primary/40 ${emailValue ? 'border-primary/40' : ''}`}
              {...register('email')}
            />
            {emailValue && !errors.email && (
              <Check className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-emerald-400" />
            )}
          </div>
        </Field>

        <Field label="Contraseña" htmlFor="password" error={errors.password?.message}>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/40" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              className={`h-12 rounded-[12px] border-white/10 bg-white/[0.04] pl-10 pr-3.5 transition focus:border-primary/40 ${passwordValue ? 'border-primary/40' : ''}`}
              {...register('password')}
            />
          </div>
          <PasswordStrength value={passwordValue ?? ''} />
        </Field>

        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full rounded-[12px] bg-gradient-to-b from-[#a855f7] to-[#9333ea] text-[15px] font-bold text-white shadow-[0_14px_32px_-8px_rgba(168,85,247,0.6),inset_0_0_0_1px_rgba(255,255,255,0.1)] transition hover:opacity-95"
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

        <p className="text-[11px] leading-[1.5] text-white/35">
          Al crear tu cuenta aceptas los{' '}
          <a href="/terminos" className="text-white/65 underline-offset-2 hover:underline">
            Términos
          </a>{' '}
          y la{' '}
          <a href="/privacidad" className="text-white/65 underline-offset-2 hover:underline">
            Política de privacidad
          </a>{' '}
          de NightPass.
        </p>
      </form>
    </div>
  );
}
