'use client';

import * as React from 'react';
import { Pause, Pencil, Play, Sparkles, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/core/components/ui/badge';
import { Button } from '@/core/components/ui/button';
import { ConfirmDialog } from '@/core/components/ui/confirm-dialog';
import { clientFetch } from '@/core/lib/api/client-client';
import type { PaginatedPromoters, Promoter } from '@/core/types/api';
import { EditPromoterDialog } from './admin-promoter-dialog';
import { useDeletePromoter } from '../hooks/use-delete-promoter';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'medium' });
}

function PromoterRowActions({ promoter }: { promoter: Promoter }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const del = useDeletePromoter({ onSuccess: () => setDeleteOpen(false) });

  const suspend = useMutation({
    mutationFn: () =>
      clientFetch<Promoter>(`/api/promoters/${promoter.id}/suspend`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast.success('Organizador suspendido');
      qc.invalidateQueries({ queryKey: ['promoters'] });
      router.refresh();
    },
    onError: () => toast.error('No pudimos suspender el organizador'),
  });

  const reactivate = useMutation({
    mutationFn: () =>
      clientFetch<Promoter>(`/api/promoters/${promoter.id}/reactivate`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast.success('Organizador reactivado');
      qc.invalidateQueries({ queryKey: ['promoters'] });
      router.refresh();
    },
    onError: () => toast.error('No pudimos reactivar el organizador'),
  });

  const isMutating = suspend.isPending || reactivate.isPending;

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground"
        title="Editar"
        disabled={isMutating}
        onClick={() => setEditOpen(true)}
      >
        <Pencil className="size-4" />
      </Button>

      {promoter.status === 'ACTIVE' ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 text-amber-500/60 hover:text-amber-400"
          title="Suspender"
          disabled={isMutating}
          onClick={() => suspend.mutate()}
        >
          <Pause className="size-4" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 text-emerald-500/60 hover:text-emerald-400"
          title="Reactivar"
          disabled={isMutating}
          onClick={() => reactivate.mutate()}
        >
          <Play className="size-4" />
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10 w-10 p-0 text-destructive/60 hover:text-destructive"
        title="Eliminar"
        disabled={isMutating}
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>

      <EditPromoterDialog
        promoter={promoter}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        variant="destructive"
        title={`¿Eliminar "${promoter.name}"?`}
        description="Esta acción no se puede deshacer. Solo se permite si el organizador no tiene eventos; de lo contrario, suspéndelo."
        confirmLabel="Eliminar"
        loading={del.isPending}
        onConfirm={() => del.mutate(promoter.id)}
      />
    </div>
  );
}

export function AdminPromoterTable({ data }: { data: PaginatedPromoters }) {
  if (data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.025] py-10 text-center sm:py-16">
        <Sparkles className="size-8 text-muted-foreground/60" />
        <p className="font-medium">Sin organizadores</p>
        <p className="text-sm text-muted-foreground">
          Aún no hay organizadores registrados.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[22px] border border-white/10 bg-white/[0.025]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-white/8 bg-white/[0.02] text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Organizador</th>
            <th className="px-4 py-3 font-medium">Ciudad</th>
            <th className="px-4 py-3 font-medium">Miembros</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Creada</th>
            <th className="px-4 py-3 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((promoter) => (
            <tr
              key={promoter.id}
              className="border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.05]"
            >
              <td className="px-4 py-3 font-medium">{promoter.name}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {promoter.city}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {promoter._count?.members ?? 0}
              </td>
              <td className="px-4 py-3">
                {promoter.status === 'ACTIVE' ? (
                  <Badge variant="success">Activa</Badge>
                ) : (
                  <Badge variant="destructive">Suspendida</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {fmtDate(promoter.createdAt)}
              </td>
              <td className="px-2 py-2 text-right">
                <PromoterRowActions promoter={promoter} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
