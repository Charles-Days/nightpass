'use client';

import * as React from 'react';
import type { IScannerControls } from '@zxing/browser';
import { Camera, RefreshCw, AlertTriangle } from 'lucide-react';
import { useScanPass, type ScanResult } from '../hooks/use-scan-pass';
import { cn } from '@/core/lib/utils/cn';
import { Button } from '@/core/components/ui/button';
import { ClientApiError } from '@/core/lib/api/client-client';

type Phase =
  | { kind: 'idle' }
  | { kind: 'scanning' }
  | { kind: 'result'; data: ScanResult; raw: string }
  | { kind: 'error'; message: string; raw?: string };

const COOLDOWN_MS = 2500;

export function QrScanner() {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const controlsRef = React.useRef<IScannerControls | null>(null);
  const lastScanRef = React.useRef<{ qr: string; at: number } | null>(null);
  const [phase, setPhase] = React.useState<Phase>({ kind: 'idle' });
  const [permissionError, setPermissionError] = React.useState<string | null>(null);
  const scanMutation = useScanPass();

  const start = React.useCallback(async () => {
    setPermissionError(null);
    setPhase({ kind: 'scanning' });
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result) => {
          if (!result) return;
          const text = result.getText();
          const last = lastScanRef.current;
          if (last && last.qr === text && Date.now() - last.at < COOLDOWN_MS) {
            return;
          }
          lastScanRef.current = { qr: text, at: Date.now() };
          handleScan(text);
        },
      );
      controlsRef.current = controls;
    } catch (err) {
      const msg = (err as Error).message ?? 'No se pudo acceder a la cámara';
      setPermissionError(msg);
      setPhase({ kind: 'idle' });
    }
  }, []);

  const handleScan = React.useCallback(
    async (qr: string) => {
      try {
        const data = await scanMutation.mutateAsync({ qrCode: qr });
        setPhase({ kind: 'result', data, raw: qr });
      } catch (err) {
        const message =
          err instanceof ClientApiError
            ? extractErrorMessage(err.payload) ?? 'Error al validar el pase'
            : (err as Error).message;
        setPhase({ kind: 'error', message, raw: qr });
      }
    },
    [scanMutation],
  );

  const reset = () => {
    lastScanRef.current = null;
    setPhase({ kind: 'scanning' });
  };

  const stop = React.useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  React.useEffect(() => {
    return () => stop();
  }, [stop]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Cámara */}
      <div className="overflow-hidden rounded-[22px] border border-white/14 bg-black/50">
        <div className="relative aspect-video md:aspect-square">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
          />
          {phase.kind === 'idle' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 p-6 text-center">
              <Camera className="size-10 text-primary" />
              <p className="max-w-xs text-sm text-muted-foreground">
                Activa la cámara para empezar a escanear pases.
              </p>
              {permissionError ? (
                <p className="text-xs text-amber-400">{permissionError}</p>
              ) : null}
              <Button onClick={start}>Iniciar cámara</Button>
            </div>
          ) : null}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-12 rounded-2xl border-2 border-primary/60 shadow-[0_0_40px_rgba(168,85,247,0.4)]"
          />
        </div>
      </div>

      {/* Resultado */}
      <div className="space-y-4">
        <ResultPanel phase={phase} />
        {phase.kind === 'result' || phase.kind === 'error' ? (
          <Button variant="outline" onClick={reset} className="w-full">
            <RefreshCw className="mr-2 size-4" /> Escanear otro
          </Button>
        ) : null}
        {phase.kind === 'scanning' && scanMutation.isPending ? (
          <p className="text-sm text-muted-foreground">Validando…</p>
        ) : null}
      </div>
    </div>
  );
}

function ResultPanel({ phase }: { phase: Phase }) {
  if (phase.kind === 'idle' || phase.kind === 'scanning') {
    return (
      <div className="rounded-[22px] border border-white/14 bg-white/[0.05] p-6 text-sm text-muted-foreground">
        Apunta la cámara al QR del pase. El resultado aparecerá aquí
        automáticamente.
      </div>
    );
  }

  if (phase.kind === 'error') {
    return (
      <div className="rounded-[22px] border border-red-500/40 bg-red-500/10 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 text-red-300" />
          <div>
            <p className="font-display text-lg font-semibold text-red-100">
              Pase inválido
            </p>
            <p className="mt-1 text-sm text-red-200/80">{phase.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const { data } = phase;
  const tone = data.valid
    ? {
        border: 'border-emerald-500/50',
        bg: 'bg-emerald-500/15',
        title: 'text-emerald-100',
        chip: 'bg-emerald-500/30 text-emerald-100',
        label: 'VÁLIDO',
      }
    : {
        border: 'border-amber-500/50',
        bg: 'bg-amber-500/15',
        title: 'text-amber-100',
        chip: 'bg-amber-500/30 text-amber-100',
        label: data.reason === 'already_used' ? 'YA USADO' : 'BLOQUEADO',
      };

  return (
    <div className={cn('rounded-[22px] border p-6', tone.border, tone.bg)}>
      <span
        className={cn(
          'inline-block rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider',
          tone.chip,
        )}
      >
        {tone.label}
      </span>
      <h3 className={cn('mt-3 font-display text-2xl font-bold', tone.title)}>
        {data.holder.name ?? data.holder.email}
      </h3>
      <p className="mt-1 text-sm text-white/80">{data.holder.email}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Cell label="Tier" value={data.tier.name} />
        <Cell label="Evento" value={data.event.title} />
      </div>
      {data.usedAt && !data.valid ? (
        <p className="mt-3 text-xs text-amber-200/80">
          Escaneado previamente: {new Date(data.usedAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/20 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function extractErrorMessage(payload: unknown): string | undefined {
  if (typeof payload === 'object' && payload !== null) {
    const obj = payload as Record<string, unknown>;
    const msg = obj.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg) && msg.length > 0) return String(msg[0]);
  }
  return undefined;
}
