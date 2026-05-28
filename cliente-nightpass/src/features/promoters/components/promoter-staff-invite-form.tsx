'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, User } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import { useInvitePromoterStaff } from '../hooks/use-invite-promoter-staff';

const schema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Mínimo 2 caracteres').max(80),
});
type FormInput = z.infer<typeof schema>;

export function PromoterStaffInviteForm() {
  const invite = useInvitePromoterStaff();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', name: '' },
  });

  const onSubmit = handleSubmit((values) => {
    invite.mutate(values, { onSuccess: () => reset() });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="promstaff-email" error={errors.email?.message}>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="promstaff-email"
              type="email"
              placeholder="staff@email.com"
              className="pl-9"
              {...register('email')}
            />
          </div>
        </Field>
        <Field label="Nombre" htmlFor="promstaff-name" error={errors.name?.message}>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="promstaff-name"
              placeholder="Nombre"
              className="pl-9"
              {...register('name')}
            />
          </div>
        </Field>
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
        <Button
          type="submit"
          disabled={invite.isPending}
          className="w-full sm:w-auto"
        >
          {invite.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {invite.isPending ? 'Invitando…' : 'Invitar al equipo'}
        </Button>
      </div>
    </form>
  );
}
