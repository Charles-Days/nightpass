'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  Send,
  Share2,
  X,
} from 'lucide-react';
import { clientFetch, ClientApiError } from '@/core/lib/api/client-client';
import { Button } from '@/core/components/ui/button';
import { paths } from '@/core/config/paths';
import type { PassTransferCreated } from '@/core/types/api';

interface PendingTransfer {
  token: string;
  expiresAt: string;
}

interface Props {
  passId: string;
  initialTransfer?: PendingTransfer | null;
}

function readError(error: unknown, fallback: string): string {
  if (error instanceof ClientApiError) {
    const payload = error.payload as { message?: string | string[] } | null;
    const m = payload?.message;
    if (Array.isArray(m)) return m[0] ?? fallback;
    if (typeof m === 'string') return m;
  }
  return fallback;
}

function buildLink(token: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${paths.recibirPase}/${token}`;
}

function formatExpiry(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function PassTransferActions({ passId, initialTransfer }: Props) {
  const router = useRouter();
  const [transfer, setTransfer] = React.useState<PendingTransfer | null>(
    initialTransfer ?? null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const create = useMutation<PassTransferCreated, ClientApiError>({
    mutationFn: () =>
      clientFetch<PassTransferCreated>(`/api/passes/${passId}/transfer`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      setError(null);
      setTransfer({ token: data.token, expiresAt: data.expiresAt });
      router.refresh();
    },
    onError: (err) =>
      setError(readError(err, 'No se pudo crear el link de transferencia')),
  });

  const cancel = useMutation<{ ok: boolean }, ClientApiError>({
    mutationFn: () =>
      clientFetch<{ ok: boolean }>(`/api/passes/${passId}/transfer`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      setError(null);
      setTransfer(null);
      setCopied(false);
      router.refresh();
    },
    onError: (err) =>
      setError(readError(err, 'No se pudo cancelar la transferencia')),
  });

  const link = transfer ? buildLink(transfer.token) : '';

  const onCopy = React.useCallback(async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('No se pudo copiar — copia el link manualmente');
    }
  }, [link]);

  const onShare = React.useCallback(async () => {
    if (!link || typeof navigator.share !== 'function') {
      void onCopy();
      return;
    }
    try {
      await navigator.share({
        title: 'Tu pase NightPass',
        text: 'Te transfiero mi pase de NightPass. Ábrelo para aceptarlo:',
        url: link,
      });
    } catch {
      /* el usuario canceló el share — sin error */
    }
  }, [link, onCopy]);

  const busy = create.isPending || cancel.isPending;

  return (
    <div className="mt-5 rounded-[20px] border border-white/10 bg-white/[0.025] p-4 sm:p-5">
      {!transfer ? (
        <>
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/15">
              <Send className="size-4 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                Transferir pase
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Genera un link para ceder este pase a otra persona. Al aceptarlo,
                tu QR deja de funcionar y pasa a su cuenta.
              </p>
            </div>
          </div>
          <Button
            onClick={() => create.mutate()}
            disabled={busy}
            className="mt-4 w-full rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] py-5 text-sm font-semibold"
          >
            {create.isPending ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Send className="mr-1.5 size-4" />
            )}
            Crear link de transferencia
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="size-1.5 rounded-full bg-amber-400" />
              Transferencia activa
            </p>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Link expira {formatExpiry(transfer.expiresAt)}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Comparte este link. Quien lo abra y lo acepte se quedará con el pase.
            Mientras tanto tu QR está bloqueado. Si nadie lo acepta antes de esa
            fecha, el link caduca y tu pase vuelve a activarse — el pase no se
            pierde.
          </p>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/60">
              {link}
            </span>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-white/80 transition hover:bg-white/[0.08]"
            >
              {copied ? (
                <>
                  <Check className="size-3 text-emerald-300" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="size-3" /> Copiar
                </>
              )}
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              onClick={onShare}
              disabled={busy}
              className="flex-1 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] py-5 text-sm font-semibold"
            >
              <Share2 className="mr-1.5 size-4" />
              Compartir
            </Button>
            <Button
              onClick={() => cancel.mutate()}
              disabled={busy}
              variant="outline"
              className="rounded-full border-white/15 bg-transparent py-5 text-sm font-semibold text-white/80 hover:bg-white/[0.06]"
            >
              {cancel.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
              )}
              Cancelar
            </Button>
          </div>
        </>
      )}

      {error && (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <AlertTriangle className="size-4 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
