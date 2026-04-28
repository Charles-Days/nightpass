'use client';

import * as React from 'react';
import { Eye, Loader2, UsersRound } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/core/components/ui/dialog';
import type { PaginatedUsers } from '@/core/types/api';
import { useUser } from '../hooks/use-user';
import { UserDetail } from './user-detail';
import { RoleBadge } from './role-badge';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'medium' });
}

function UserModal({
  userId,
  onClose,
}: {
  userId: string | null;
  onClose: () => void;
}) {
  const { data: user, isLoading } = useUser(userId);

  return (
    <Dialog open={!!userId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{user?.name ?? user?.email ?? '—'}</DialogTitle>
          <DialogDescription>
            {user ? (
              <>{user.email} · {user.role}</>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !user ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <UserDetail user={user} hideHeader />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function UserTable({ data }: { data: PaginatedUsers }) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  if (data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.025] py-16 text-center">
        <UsersRound className="size-8 text-muted-foreground/60" />
        <p className="font-medium">Sin usuarios</p>
        <p className="text-sm text-muted-foreground">
          No hay usuarios que coincidan con los filtros.
        </p>
      </div>
    );
  }

  return (
    <>
      <UserModal userId={activeId} onClose={() => setActiveId(null)} />

      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/8 bg-white/[0.02] text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Creado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((user) => (
              <tr
                key={user.id}
                className="cursor-pointer border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.05]"
                onClick={() => setActiveId(user.id)}
              >
                <td className="px-4 py-3 font-medium">{user.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(user.createdAt)}</td>
                <td
                  className="px-2 py-2 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0 text-muted-foreground hover:text-foreground"
                    title="Ver detalle"
                    onClick={() => setActiveId(user.id)}
                  >
                    <Eye className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
