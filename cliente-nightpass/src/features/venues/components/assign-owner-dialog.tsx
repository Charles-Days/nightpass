'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Field } from '@/core/components/ui/field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/core/components/ui/dialog';
import { useAssignOwner } from '../hooks/use-assign-owner';

const schema = z.object({
  email: z.string().email('Email inválido').max(254),
  name: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length >= 2 ? v : undefined)),
});

type Input = z.infer<typeof schema>;

export function AssignOwnerDialog({ venueId, venueName }: { venueId: string; venueName: string }) {
  const [open, setOpen] = React.useState(false);
  const assign = useAssignOwner(venueId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', name: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await assign.mutateAsync(values);
      reset();
      setOpen(false);
    } catch {
      // toast handled by hook
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="gap-1.5">
          <UserPlus className="size-3.5" />
          Asignar dueño
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar dueño a {venueName}</DialogTitle>
          <DialogDescription>
            Si el email ya tiene cuenta, le sumamos este local a sus accesos. Si
            no, le creamos una cuenta con contraseña temporal y le mandamos las
            credenciales por correo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <Field label="Email" htmlFor="owner-email" error={errors.email?.message}>
            <Input
              id="owner-email"
              type="email"
              autoComplete="email"
              placeholder="dueno@ejemplo.com"
              {...register('email')}
            />
          </Field>

          <Field
            label="Nombre (opcional, solo si el email es nuevo)"
            htmlFor="owner-name"
            error={errors.name?.message}
          >
            <Input
              id="owner-name"
              type="text"
              autoComplete="name"
              placeholder="Nombre completo"
              {...register('name')}
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={assign.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={assign.isPending}>
              {assign.isPending && <Loader2 className="size-4 animate-spin" />}
              Asignar dueño
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
