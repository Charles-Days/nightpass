'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Loader2, Ticket } from 'lucide-react';
import { clientFetch, ClientApiError } from '@/core/lib/api/client-client';
import { Button } from '@/core/components/ui/button';
import { paths } from '@/core/config/paths';
import type { PassTransferAccepted } from '@/core/types/api';

interface Props {
  token: string;
  /** Cuando true, el botón se deshabilita (transferencia no aceptable). */
  disabled?: boolean;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

function readError(error: unknown): string {
  if (error instanceof ClientApiError) {
    const payload = error.payload as { message?: string | string[] } | null;
    const m = payload?.message;
    if (Array.isArray(m)) return m[0] ?? 'No se pudo aceptar la transferencia';
    if (typeof m === 'string') return m;
  }
  return 'No se pudo aceptar la transferencia';
}

export function TransferAccept({ token, disabled }: Props) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>({ kind: 'idle' });

  const accept = useMutation<PassTransferAccepted, ClientApiError>({
    mutationFn: () =>
      clientFetch<PassTransferAccepted>(
        `/api/passes/transfers/${token}/accept`,
        { method: 'POST' },
      ),
    onSuccess: (data) => {
      setPhase({ kind: 'success' });
      setTimeout(
        () => router.push(`${paths.pases}/${data.passId}` as never),
        1100,
      );
    },
    onError: (err) => setPhase({ kind: 'error', message: readError(err) }),
  });

  if (phase.kind === 'success') {
    return (
      <div className="grid place-items-center gap-3 rounded-[20px] border border-emerald-400/30 bg-emerald-400/10 px-6 py-8 text-center">
        <CheckCircle2 className="size-12 text-emerald-300" />
        <p className="text-sm font-semibold text-emerald-100">
          ¡Pase aceptado!
        </p>
        <p className="text-xs text-white/70">Abriendo tu pase…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={() => accept.mutate()}
        disabled={disabled || accept.isPending}
        className="w-full rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] py-6 text-base font-semibold"
      >
        {accept.isPending ? (
          <Loader2 className="mr-1.5 size-5 animate-spin" />
        ) : (
          <Ticket className="mr-1.5 size-5" />
        )}
        Aceptar transferencia
      </Button>

      {phase.kind === 'error' && (
        <p className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <AlertTriangle className="size-4 shrink-0" /> {phase.message}
        </p>
      )}
    </div>
  );
}
