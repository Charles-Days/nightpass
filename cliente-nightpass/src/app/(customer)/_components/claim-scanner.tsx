'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { IScannerControls } from '@zxing/browser';
import { AlertTriangle, Camera, CheckCircle2, Loader2, QrCode } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { clientFetch, ClientApiError } from '@/core/lib/api/client-client';
import { Button } from '@/core/components/ui/button';
import { paths } from '@/core/config/paths';

interface ClaimResponse {
  passId: string;
  alreadyClaimed: boolean;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'scanning' }
  | { kind: 'claiming' }
  | { kind: 'success'; passId: string; already: boolean }
  | { kind: 'error'; message: string };

function readError(error: unknown): string {
  if (error instanceof ClientApiError) {
    const payload = error.payload as { message?: string | string[] } | null;
    const m = payload?.message;
    if (Array.isArray(m)) return m[0] ?? 'No se pudo reclamar el pase';
    if (typeof m === 'string') return m;
    if (error.status === 404) return 'Vale no válido';
  }
  return 'No se pudo reclamar el pase';
}

export function ClaimScanner() {
  const router = useRouter();
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const controlsRef = React.useRef<IScannerControls | null>(null);
  const handledRef = React.useRef(false);
  const [phase, setPhase] = React.useState<Phase>({ kind: 'idle' });
  const [permError, setPermError] = React.useState<string | null>(null);

  const claim = useMutation<ClaimResponse, ClientApiError, string>({
    mutationFn: (code) =>
      clientFetch<ClaimResponse>('/api/passes/claim', { method: 'POST', body: { code } }),
  });

  const stop = React.useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  const handleCode = React.useCallback(
    async (text: string) => {
      const code = text.trim();
      // Solo nos interesan los QR de vale RP (`npc_...`); ignoramos el resto.
      if (handledRef.current || !code.startsWith('npc_')) return;
      handledRef.current = true;
      stop();
      setPhase({ kind: 'claiming' });
      try {
        const res = await claim.mutateAsync(code);
        setPhase({ kind: 'success', passId: res.passId, already: res.alreadyClaimed });
        setTimeout(() => router.push(`${paths.pases}/${res.passId}` as never), 1100);
      } catch (err) {
        setPhase({ kind: 'error', message: readError(err) });
        handledRef.current = false;
      }
    },
    [claim, router, stop],
  );

  const start = React.useCallback(async () => {
    setPermError(null);
    handledRef.current = false;
    setPhase({ kind: 'scanning' });
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      controlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result) => {
          if (result) handleCode(result.getText());
        },
      );
    } catch (err) {
      setPermError((err as Error).message ?? 'No se pudo acceder a la cámara');
      setPhase({ kind: 'idle' });
    }
  }, [handleCode]);

  React.useEffect(() => () => stop(), [stop]);

  return (
    <div className="space-y-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-[24px] border border-white/10 bg-black/40">
        <video ref={videoRef} className="size-full object-cover" muted playsInline />

        {/* Overlay según fase */}
        {phase.kind === 'idle' && (
          <button
            type="button"
            onClick={start}
            className="absolute inset-0 grid place-items-center gap-3 bg-black/50 text-white/80 transition hover:bg-black/40"
          >
            <span className="grid size-16 place-items-center rounded-2xl border border-primary/30 bg-primary/15">
              <Camera className="size-7 text-primary" />
            </span>
            <span className="text-sm font-semibold">Tocar para activar la cámara</span>
          </button>
        )}

        {phase.kind === 'scanning' && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 size-2/3 -translate-x-1/2 -translate-y-1/2 rounded-[20px] border-2 border-primary/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            <span className="absolute inset-x-0 bottom-4 text-center text-xs font-medium text-white/80">
              Apunta al QR del pase
            </span>
          </div>
        )}

        {phase.kind === 'claiming' && (
          <div className="absolute inset-0 grid place-items-center gap-3 bg-black/65 text-white">
            <Loader2 className="size-8 animate-spin text-primary" />
            <span className="text-sm font-semibold">Asignando tu pase…</span>
          </div>
        )}

        {phase.kind === 'success' && (
          <div className="absolute inset-0 grid place-items-center gap-3 bg-emerald-600/25 text-white backdrop-blur-sm">
            <CheckCircle2 className="size-12 text-emerald-300" />
            <span className="text-sm font-semibold">
              {phase.already ? 'Este pase ya era tuyo' : '¡Pase asignado!'}
            </span>
            <span className="text-xs text-white/70">Abriendo tu pase…</span>
          </div>
        )}

        {phase.kind === 'error' && (
          <div className="absolute inset-0 grid place-items-center gap-3 bg-rose-700/30 p-6 text-center text-white backdrop-blur-sm">
            <AlertTriangle className="size-10 text-rose-300" />
            <span className="text-sm font-semibold">{phase.message}</span>
          </div>
        )}
      </div>

      {permError && (
        <p className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <AlertTriangle className="size-4 shrink-0" /> {permError}
        </p>
      )}

      {(phase.kind === 'idle' || phase.kind === 'error') && (
        <Button
          onClick={start}
          className="w-full rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] py-6 text-base font-semibold"
        >
          <QrCode className="mr-1.5 size-5" />
          {phase.kind === 'error' ? 'Reintentar' : 'Escanear pase'}
        </Button>
      )}
    </div>
  );
}
