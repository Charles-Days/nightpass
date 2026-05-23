'use client';

import { useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { useLogout } from '@/features/auth';
import { paths } from '@/core/config/paths';

export function LogoutButton() {
  const { mutate, isPending } = useLogout({ redirectTo: paths.appHome });
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex flex-col gap-2 p-2 sm:flex-row np-fade-in">
        <Button
          type="button"
          onClick={() => mutate()}
          disabled={isPending}
          className="h-12 w-full gap-2 rounded-[12px] bg-destructive text-sm font-semibold text-white shadow-[0_4px_18px_-4px_rgba(239,68,68,0.55)] transition hover:brightness-110 active:scale-95 disabled:opacity-70 disabled:active:scale-100 transform-gpu sm:flex-1"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          {isPending ? 'Cerrando sesion...' : 'Si, cerrar sesion'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="h-12 w-full rounded-[12px] text-sm font-medium text-white/70 hover:bg-white/[0.04] hover:text-foreground active:scale-95 transform-gpu sm:flex-1"
        >
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => setConfirming(true)}
      disabled={isPending}
      className="w-full justify-start gap-3 rounded-[14px] px-4 py-6 text-sm font-medium text-destructive transition-all hover:bg-destructive/10 hover:text-destructive active:scale-[0.98] transform-gpu"
    >
      <LogOut className="size-4" />
      <span>Cerrar sesion</span>
    </Button>
  );
}
