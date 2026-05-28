'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClientApiError, clientFetch } from '@/core/lib/api/client-client';
import type { Event } from '@/core/types/api';
import { paths } from '@/core/config/paths';
import { EventFormPromoter } from '@/features/events';

function readError(error: unknown): string {
  if (error instanceof ClientApiError) {
    if (error.status === 400) return 'Datos inválidos';
    if (error.status === 403) return 'No tienes permisos para crear este evento';
  }
  return 'No pudimos crear el evento';
}

export function PromoterEventCreate({ promoterId }: { promoterId: string }) {
  const router = useRouter();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      clientFetch<Event>('/api/events', { method: 'POST', body: input }),
    onSuccess: () => {
      toast.success('Evento creado. Ábrelo para agregar tiers.');
      qc.invalidateQueries({ queryKey: ['events'] });
      router.push(paths.miOrganizadorEventos);
    },
    onError: (err) => toast.error(readError(err)),
  });

  return (
    <EventFormPromoter
      promoterId={promoterId}
      onSubmit={async (payload) => {
        await create.mutateAsync(payload);
      }}
      isPending={create.isPending}
      submitLabel="Crear evento"
    />
  );
}
