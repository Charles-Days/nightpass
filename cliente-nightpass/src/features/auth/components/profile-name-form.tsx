'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Loader2, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import { profileNameSchema, type ProfileNameInput } from '../schemas/account.schema';
import { useUpdateProfile } from '../hooks/use-update-profile';

export function ProfileNameForm({ initialName }: { initialName: string }) {
  const { mutate, isPending } = useUpdateProfile({
    onSuccess: () => toast.success('Nombre actualizado'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileNameInput>({
    resolver: zodResolver(profileNameSchema),
    defaultValues: { name: initialName },
  });

  const onSubmit = handleSubmit((values) => mutate(values));

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Nombre" htmlFor="profile-name" error={errors.name?.message}>
        <div className="relative">
          <UserIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="profile-name"
            placeholder="Tu nombre"
            className="h-11 pl-9"
            {...register('name')}
          />
        </div>
      </Field>
      <Button type="submit" disabled={isPending || !isDirty} className="rounded-full">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        {isPending ? 'Guardando…' : 'Guardar nombre'}
      </Button>
    </form>
  );
}
