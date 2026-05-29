'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Textarea } from '@/core/components/ui/textarea';
import { Field } from '@/core/components/ui/field';
import type { Promoter } from '@/core/types/api';
import {
  adminUpdatePromoterSchema,
  createPromoterSchema,
  type AdminUpdatePromoterInput,
  type CreatePromoterInput,
} from '../schemas/admin-promoter.schema';
import { useCreatePromoter } from '../hooks/use-create-promoter';
import { useAdminUpdatePromoter } from '../hooks/use-admin-update-promoter';

// ── Create ───────────────────────────────────────────────────────────────────

export function CreatePromoterDialog() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
        <Plus className="size-4" />
        Nuevo organizador
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-white/10 bg-[#0f0d18]/95 backdrop-blur-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold tracking-tight">
              Nuevo organizador
            </DialogTitle>
            <DialogDescription className="text-sm text-white/65">
              Crea el organizador y asigna su dueño por email. Las credenciales
              se envían solo por correo.
            </DialogDescription>
          </DialogHeader>
          <CreateForm onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const create = useCreatePromoter({ onSuccess: onDone });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePromoterInput>({
    resolver: zodResolver(createPromoterSchema),
    defaultValues: {
      name: '',
      city: '',
      phone: '',
      instagram: '',
      website: '',
      bio: '',
      ownerEmail: '',
      ownerName: '',
    },
  });

  const onSubmit = handleSubmit((values) => create.mutate(values));

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="prom-name" error={errors.name?.message}>
          <Input id="prom-name" placeholder="Producciones XYZ" {...register('name')} />
        </Field>
        <Field label="Ciudad" htmlFor="prom-city" error={errors.city?.message}>
          <Input id="prom-city" placeholder="Lima" {...register('city')} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email del dueño" htmlFor="prom-owner-email" error={errors.ownerEmail?.message}>
          <Input id="prom-owner-email" type="email" placeholder="dueno@email.com" {...register('ownerEmail')} />
        </Field>
        <Field label="Nombre del dueño" htmlFor="prom-owner-name" error={errors.ownerName?.message}>
          <Input id="prom-owner-name" placeholder="Nombre y apellido" {...register('ownerName')} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Teléfono" htmlFor="prom-phone" error={errors.phone?.message}>
          <Input id="prom-phone" placeholder="+51 999 999 999" {...register('phone')} />
        </Field>
        <Field label="Instagram" htmlFor="prom-ig" error={errors.instagram?.message}>
          <Input id="prom-ig" placeholder="@organizador" {...register('instagram')} />
        </Field>
      </div>

      <Field label="Web" htmlFor="prom-web" error={errors.website?.message}>
        <Input id="prom-web" placeholder="https://..." {...register('website')} />
      </Field>

      <Field label="Bio" htmlFor="prom-bio" error={errors.bio?.message}>
        <Textarea id="prom-bio" rows={3} placeholder="Descripción breve (opcional)" {...register('bio')} />
      </Field>

      <DialogFooter className="gap-2 sm:gap-3">
        <Button type="submit" disabled={create.isPending} className="w-full sm:w-auto">
          {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {create.isPending ? 'Creando…' : 'Crear organizador'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ── Edit ─────────────────────────────────────────────────────────────────────

export function EditPromoterDialog({
  promoter,
  open,
  onOpenChange,
}: {
  promoter: Promoter;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#0f0d18]/95 backdrop-blur-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold tracking-tight">
            Editar organizador
          </DialogTitle>
          <DialogDescription className="text-sm text-white/65">
            {promoter.name}
          </DialogDescription>
        </DialogHeader>
        <EditForm promoter={promoter} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  promoter,
  onDone,
}: {
  promoter: Promoter;
  onDone: () => void;
}) {
  const update = useAdminUpdatePromoter(promoter.id, { onSuccess: onDone });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminUpdatePromoterInput>({
    resolver: zodResolver(adminUpdatePromoterSchema),
    defaultValues: {
      name: promoter.name,
      city: promoter.city,
      phone: promoter.phone ?? '',
      instagram: promoter.instagram ?? '',
      website: promoter.website ?? '',
      bio: promoter.bio ?? '',
    },
  });

  const onSubmit = handleSubmit((values) => update.mutate(values));

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="edit-name" error={errors.name?.message}>
          <Input id="edit-name" {...register('name')} />
        </Field>
        <Field label="Ciudad" htmlFor="edit-city" error={errors.city?.message}>
          <Input id="edit-city" {...register('city')} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Teléfono" htmlFor="edit-phone" error={errors.phone?.message}>
          <Input id="edit-phone" {...register('phone')} />
        </Field>
        <Field label="Instagram" htmlFor="edit-ig" error={errors.instagram?.message}>
          <Input id="edit-ig" {...register('instagram')} />
        </Field>
      </div>

      <Field label="Web" htmlFor="edit-web" error={errors.website?.message}>
        <Input id="edit-web" {...register('website')} />
      </Field>

      <Field label="Bio" htmlFor="edit-bio" error={errors.bio?.message}>
        <Textarea id="edit-bio" rows={3} {...register('bio')} />
      </Field>

      <DialogFooter className="gap-2 sm:gap-3">
        <Button type="submit" disabled={update.isPending} className="w-full sm:w-auto">
          {update.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {update.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </DialogFooter>
    </form>
  );
}
