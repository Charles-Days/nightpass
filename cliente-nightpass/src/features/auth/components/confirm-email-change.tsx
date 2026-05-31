'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { paths } from '@/core/config/paths';
import { useConfirmEmailChange } from '../hooks/use-confirm-email-change';

export function ConfirmEmailChange({ token }: { token: string }) {
  const { mutate, isPending, isSuccess, isError } = useConfirmEmailChange();
  const firedRef = React.useRef(false);

  React.useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    mutate(token);
  }, [mutate, token]);

  if (isSuccess) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 rounded-md border border-primary/40 bg-primary/10 px-4 py-3.5 text-sm">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-foreground">
            Tu correo fue actualizado. Por seguridad cerramos tus sesiones — inicia
            sesión de nuevo con tu nuevo correo.
          </p>
        </div>
        <Link
          href={paths.login}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Iniciar sesión
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            Este link es inválido o expiró. Vuelve a solicitar el cambio de correo
            desde tu cuenta.
          </p>
        </div>
        <Link
          href={paths.miCuenta}
          className="text-sm font-medium text-primary hover:underline"
        >
          Ir a mi cuenta
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin text-primary" />
      {isPending ? 'Confirmando tu nuevo correo…' : 'Procesando…'}
    </div>
  );
}
