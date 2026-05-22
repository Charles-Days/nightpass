'use client';

import { Loader2, LogOut } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { useLogout } from '@/features/auth';
import { paths } from '@/core/config/paths';

export function LogoutButton() {
  const { mutate, isPending } = useLogout({ redirectTo: paths.appHome });

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => mutate()}
      disabled={isPending}
      className="w-full justify-start gap-3 rounded-[14px] px-4 py-6 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
      <span>{isPending ? 'Cerrando sesion...' : 'Cerrar sesion'}</span>
    </Button>
  );
}
