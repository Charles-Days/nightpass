'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { ClientApiError } from '@/core/lib/api/client-client';
import type { Role } from '@/core/types/api';
import { useUpdateUserRole } from '../hooks/use-user';

const ROLES: { value: Role; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'VENUE_OWNER', label: 'Dueño de local' },
  { value: 'VENUE_STAFF', label: 'Staff de local' },
  { value: 'PROMOTER', label: 'Organizador' },
  { value: 'PROMOTER_STAFF', label: 'Staff organizador' },
  { value: 'RP', label: 'RP' },
  { value: 'CUSTOMER', label: 'Cliente' },
];

function errMsg(e: unknown): string {
  if (e instanceof ClientApiError && e.payload && typeof e.payload === 'object') {
    const m = (e.payload as { message?: unknown }).message;
    if (typeof m === 'string' && m) return m;
  }
  return 'No se pudo cambiar el rol';
}

/** Solo admin: cambia el rol de un usuario. */
export function RoleChanger({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: Role;
}) {
  const [role, setRole] = React.useState<Role>(currentRole);
  const update = useUpdateUserRole();

  React.useEffect(() => {
    setRole(currentRole);
  }, [currentRole]);

  const changed = role !== currentRole;

  const save = () => {
    update.mutate(
      { id: userId, role },
      {
        onSuccess: () => toast.success('Rol actualizado'),
        onError: (e) => toast.error(errMsg(e)),
      },
    );
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[180px] flex-1">
        <label
          htmlFor="user-role"
          className="text-muted-foreground/80 text-xs uppercase tracking-wide"
        >
          Rol del usuario
        </label>
        <select
          id="user-role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="border-input bg-background mt-1 h-10 w-full rounded-md border px-3 text-sm focus:border-primary/50 focus:outline-none"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value} className="bg-[#0c0c12]">
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <Button
        type="button"
        onClick={save}
        disabled={!changed || update.isPending}
        className="h-10 rounded-md bg-gradient-to-r from-[#9333ea] to-[#a855f7] font-semibold"
      >
        {update.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
        Guardar rol
      </Button>
    </div>
  );
}
