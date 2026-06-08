'use client';

import * as React from 'react';
import { useToggleRpActive, type RpProfile } from '../hooks/use-rp';
import { toast } from 'sonner';
import { ClientApiError } from '@/core/lib/api/client-client';
import { Button } from '@/core/components/ui/button';
import { Badge } from '@/core/components/ui/badge';
import {
  Loader2,
  Eye,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface RpTableProps {
  rps: RpProfile[];
  isLoading: boolean;
  onViewDetail: (rpId: string) => void;
  basePath?: string;
}

export function RpTable({ rps, isLoading, onViewDetail, basePath = '/api/rp' }: RpTableProps) {
  const { mutate: toggleActive, isPending: toggling } = useToggleRpActive(basePath);

  const handleToggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleActive(id, {
      onSuccess: () => {
        toast.success('Estado del RP actualizado correctamente');
      },
      onError: (err) => {
        const msg =
          err instanceof ClientApiError &&
          err.payload &&
          typeof err.payload === 'object' &&
          typeof (err.payload as { message?: unknown }).message === 'string'
            ? (err.payload as { message: string }).message
            : 'Error al cambiar estado';
        toast.error(msg);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (rps.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/14 p-12 text-center text-sm text-muted-foreground bg-white/[0.02]">
        No hay RPs registrados.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#0c0c12] text-xs">
      {/* Header solo en desktop — en móvil cada fila es una card. */}
      <div className="hidden border-b border-white/12 bg-white/[0.035] p-4 font-semibold text-white/70 md:grid md:grid-cols-5">
        <span>Código</span>
        <span>Nombre / Email</span>
        <span>Organizador</span>
        <span className="text-center">Estado</span>
        <span className="text-right">Acciones</span>
      </div>
      <div className="divide-y divide-white/10">
        {rps.map((rp) => (
          <div
            key={rp.id}
            onClick={() => onViewDetail(rp.id)}
            className="flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:bg-white/[0.02] md:grid md:grid-cols-5 md:items-center md:gap-0"
          >
            <div>
              <span className="rounded border border-white/14 bg-white/5 px-2 py-0.5 font-mono font-bold text-purple-300">
                {rp.rpCode}
              </span>
            </div>

            <div className="min-w-0 space-y-0.5">
              <span className="block text-sm font-medium text-white">
                {rp.displayName}
              </span>
              <span className="block truncate text-muted-foreground">
                {rp.user?.email}
              </span>
            </div>

            <div className="text-muted-foreground">
              {rp.promoter?.name ? (
                <Badge variant="outline" className="border-white/22 text-white">
                  {rp.promoter.name}
                </Badge>
              ) : (
                <span className="italic text-muted-foreground">Global</span>
              )}
            </div>

            {/* Estado + acciones: fila en móvil, celdas del grid en desktop. */}
            <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-3 md:contents md:border-0 md:pt-0">
              <div className="md:flex md:justify-center">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => handleToggle(rp.id, e)}
                  disabled={toggling}
                  className="h-8 px-0 hover:bg-transparent md:px-3"
                >
                  {rp.isActive ? (
                    <div className="flex items-center gap-1 text-emerald-400">
                      <ToggleRight className="size-6" />
                      <span>Activo</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ToggleLeft className="size-6" />
                      <span>Inactivo</span>
                    </div>
                  )}
                </Button>
              </div>

              <div className="md:flex md:justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetail(rp.id);
                  }}
                  className="flex h-8 items-center gap-1 rounded-lg px-3 text-white/80 hover:bg-white/5"
                >
                  <Eye className="size-3.5" />
                  Detalles
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
