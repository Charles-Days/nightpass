'use client';

import * as React from 'react';
import { useToggleRpActive, type RpProfile } from '../hooks/use-rp';
import { toast } from 'sonner';
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
}

export function RpTable({ rps, isLoading, onViewDetail }: RpTableProps) {
  const { mutate: toggleActive, isPending: toggling } = useToggleRpActive();

  const handleToggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleActive(id, {
      onSuccess: () => {
        toast.success('Estado del RP actualizado correctamente');
      },
      onError: (err: any) => {
        toast.error(err.payload?.message || 'Error al cambiar estado');
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
      <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-muted-foreground bg-white/[0.01]">
        No hay promotores de Relaciones Públicas registrados.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#0c0c12] text-xs">
      <div className="grid grid-cols-5 border-b border-white/8 bg-white/[0.02] p-4 font-semibold text-white/70">
        <span>Código</span>
        <span>Nombre / Email</span>
        <span>Organizador</span>
        <span className="text-center">Estado</span>
        <span className="text-right">Acciones</span>
      </div>
      <div className="divide-y divide-white/5">
        {rps.map((rp) => (
          <div
            key={rp.id}
            onClick={() => onViewDetail(rp.id)}
            className="grid grid-cols-5 p-4 items-center hover:bg-white/[0.01] transition-colors cursor-pointer"
          >
            <div>
              <span className="font-mono text-purple-300 font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                {rp.rpCode}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="font-medium text-white text-sm block">
                {rp.displayName}
              </span>
              <span className="text-muted-foreground block truncate">
                {rp.user?.email}
              </span>
            </div>

            <div className="text-muted-foreground">
              {rp.promoter?.name ? (
                <Badge variant="outline" className="text-white border-white/20">
                  {rp.promoter.name}
                </Badge>
              ) : (
                <span className="text-muted-foreground italic">Global</span>
              )}
            </div>

            <div className="flex justify-center">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => handleToggle(rp.id, e)}
                disabled={toggling}
                className="h-8 hover:bg-transparent"
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

            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetail(rp.id);
                }}
                className="h-8 px-3 hover:bg-white/5 text-white/80 rounded-lg flex items-center gap-1"
              >
                <Eye className="size-3.5" />
                Detalles
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
