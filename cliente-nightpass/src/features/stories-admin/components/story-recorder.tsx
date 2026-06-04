'use client';

import * as React from 'react';
import { Loader2, RefreshCw, RotateCcw, SwitchCamera, X } from 'lucide-react';
import { Button } from '@/core/components/ui/button';

interface StoryRecorderProps {
  onRecorded: (file: File, durationMs: number) => void;
  onCancel: () => void;
  maxDurationMs: number;
  fill?: boolean;
}

type RecorderState = 'initializing' | 'idle' | 'recording' | 'preview' | 'denied' | 'unsupported';

type FacingMode = 'user' | 'environment';

const RECORDER_MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
];

function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const candidate of RECORDER_MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(candidate)) return candidate;
    } catch {
      // some browsers throw on unknown types — keep iterating.
    }
  }
  return '';
}

function formatTimer(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function StoryRecorder({ onRecorded, onCancel, maxDurationMs, fill = false }: StoryRecorderProps) {
  const [state, setState] = React.useState<RecorderState>('initializing');
  const [facingMode, setFacingMode] = React.useState<FacingMode>('user');
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const liveVideoRef = React.useRef<HTMLVideoElement>(null);
  const previewVideoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);
  const startTimeRef = React.useRef<number>(0);
  const recordedBlobRef = React.useRef<Blob | null>(null);
  const recordedDurationRef = React.useRef<number>(0);
  const timerIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewUrlRef = React.useRef<string | null>(null);

  const stopStream = React.useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const clearTimers = React.useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
  }, []);

  const revokePreview = React.useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const startStream = React.useCallback(
    async (mode: FacingMode) => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setState('unsupported');
        setErrorMessage('Tu navegador no soporta grabación. Usa la opción Subir archivo.');
        return;
      }
      if (typeof MediaRecorder === 'undefined') {
        setState('unsupported');
        setErrorMessage('Tu navegador no soporta grabación. Usa la opción Subir archivo.');
        return;
      }
      setErrorMessage(null);
      setState('initializing');
      stopStream();
      try {
        // Constraints permisivas: pedir aspecto 9:16 pero dejar al navegador
        // elegir resolución nativa. Width/height fijos en portrait fuerzan al
        // sensor a recortar (= zoom digital) o a saltar a lente telephoto en
        // iOS, lo que produce ese "zoom enorme" reportado en móvil.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            aspectRatio: { ideal: 9 / 16 },
            width: { ideal: 720, max: 1080 },
            height: { ideal: 1280, max: 1920 },
          },
          audio: true,
        });
        streamRef.current = stream;
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          // iOS Safari: ensure playback starts.
          liveVideoRef.current.play().catch(() => {
            // ignored — autoplay restrictions handled by user gesture flow.
          });
        }
        setState('idle');
      } catch (err) {
        console.error('[story-recorder] getUserMedia failed', err);
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setState('denied');
          setErrorMessage('Permite acceso a tu cámara para grabar historias.');
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setState('denied');
          setErrorMessage('No encontramos una cámara disponible en este dispositivo.');
        } else {
          setState('denied');
          setErrorMessage('No pudimos acceder a la cámara. Intenta de nuevo.');
        }
      }
    },
    [stopStream],
  );

  // Mount: ask for camera once. Cleanup on unmount.
  React.useEffect(() => {
    void startStream(facingMode);
    return () => {
      clearTimers();
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      recorderRef.current = null;
      chunksRef.current = [];
      recordedBlobRef.current = null;
      stopStream();
      revokePreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When previewUrl updates, attach to preview video for autoplay loop.
  React.useEffect(() => {
    if (state === 'preview' && previewUrl && previewVideoRef.current) {
      previewVideoRef.current.src = previewUrl;
      previewVideoRef.current.play().catch(() => {
        // ignored
      });
    }
  }, [state, previewUrl]);

  const handleStop = React.useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state === 'inactive') return;
    try {
      recorder.stop();
    } catch (err) {
      console.error('[story-recorder] stop failed', err);
    }
  }, []);

  const handleStart = React.useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = pickMimeType();
    if (mimeType === null) {
      setState('unsupported');
      setErrorMessage('Tu navegador no soporta grabación. Usa la opción Subir archivo.');
      return;
    }

    chunksRef.current = [];
    recordedBlobRef.current = null;

    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch (err) {
      console.error('[story-recorder] MediaRecorder construct failed', err);
      setState('unsupported');
      setErrorMessage('Tu navegador no soporta grabación. Usa la opción Subir archivo.');
      return;
    }

    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onerror = (event) => {
      console.error('[story-recorder] recorder error', event);
    };

    recorder.onstop = () => {
      clearTimers();
      const finalType = recorder.mimeType || mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: finalType });
      const duration = Math.min(Date.now() - startTimeRef.current, maxDurationMs);
      recordedBlobRef.current = blob;
      recordedDurationRef.current = duration;
      revokePreview();
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setElapsedMs(duration);
      setState('preview');
    };

    try {
      recorder.start(250);
    } catch (err) {
      console.error('[story-recorder] start failed', err);
      setState('unsupported');
      setErrorMessage('Tu navegador no soporta grabación. Usa la opción Subir archivo.');
      return;
    }

    startTimeRef.current = Date.now();
    setElapsedMs(0);
    setState('recording');

    timerIntervalRef.current = setInterval(() => {
      const delta = Date.now() - startTimeRef.current;
      setElapsedMs(Math.min(delta, maxDurationMs));
    }, 100);

    stopTimeoutRef.current = setTimeout(() => {
      handleStop();
    }, maxDurationMs);
  }, [clearTimers, handleStop, maxDurationMs, revokePreview]);

  const handleToggleFacing = React.useCallback(() => {
    if (state !== 'idle') return;
    const next: FacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    void startStream(next);
  }, [facingMode, startStream, state]);

  const handleRetake = React.useCallback(() => {
    recordedBlobRef.current = null;
    recordedDurationRef.current = 0;
    revokePreview();
    setPreviewUrl(null);
    setElapsedMs(0);
    setState('idle');
    // Reattach the live stream if it was paused.
    if (liveVideoRef.current && streamRef.current) {
      liveVideoRef.current.srcObject = streamRef.current;
      liveVideoRef.current.play().catch(() => {});
    } else {
      void startStream(facingMode);
    }
  }, [facingMode, revokePreview, startStream]);

  const handleConfirm = React.useCallback(() => {
    const blob = recordedBlobRef.current;
    if (!blob) return;
    const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const file = new File([blob], `story-${Date.now()}.${extension}`, {
      type: blob.type || (extension === 'mp4' ? 'video/mp4' : 'video/webm'),
    });
    onRecorded(file, recordedDurationRef.current);
  }, [onRecorded]);

  const handleCancel = React.useCallback(() => {
    clearTimers();
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    stopStream();
    revokePreview();
    onCancel();
  }, [clearTimers, onCancel, revokePreview, stopStream]);

  const handleRetryPermission = React.useCallback(() => {
    void startStream(facingMode);
  }, [facingMode, startStream]);

  const maxSeconds = Math.round(maxDurationMs / 1000);
  const progress = state === 'recording' ? Math.min(1, elapsedMs / maxDurationMs) : 0;
  const ringCircumference = 2 * Math.PI * 38; // r=38 in the SVG below
  const ringOffset = ringCircumference * (1 - progress);

  return (
    <div className={fill ? 'relative flex size-full flex-col overflow-hidden bg-black' : 'relative overflow-hidden rounded-[18px] border border-white/14 bg-black'}>
      <div className={fill ? 'relative min-h-0 flex-1' : 'relative aspect-[9/16] max-h-[560px] w-full'}>
        {/* Live preview — visible in initializing/idle/recording. Hidden but kept mounted while preview. */}
        <video
          ref={liveVideoRef}
          className={`size-full object-cover ${state === 'preview' ? 'hidden' : 'block'} ${
            facingMode === 'user' ? 'scale-x-[-1]' : ''
          }`}
          muted
          autoPlay
          playsInline
        />

        {state === 'preview' ? (
          <video
            ref={previewVideoRef}
            className="size-full object-cover"
            controls
            muted
            loop
            autoPlay
            playsInline
          />
        ) : null}

        {/* Overlays */}
        {state === 'initializing' ? (
          <div className="absolute inset-0 grid place-items-center bg-black/60 text-white/85">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs text-white/70">Iniciando cámara…</p>
            </div>
          </div>
        ) : null}

        {(state === 'denied' || state === 'unsupported') && errorMessage ? (
          <div className="absolute inset-0 grid place-items-center bg-black/80 px-6 text-center">
            <div className="flex max-w-[80%] flex-col items-center gap-3">
              <p className="text-sm text-white/85">{errorMessage}</p>
              <div className="flex gap-2">
                {state === 'denied' ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-full"
                    onClick={handleRetryPermission}
                  >
                    <RefreshCw className="size-3.5" />
                    Reintentar
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full text-white/80"
                  onClick={handleCancel}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Top controls — cancel + facing toggle */}
        {(state === 'idle' || state === 'recording' || state === 'initializing') ? (
          <>
            <button
              type="button"
              onClick={handleCancel}
              className="absolute left-3 top-3 grid size-9 place-items-center rounded-full bg-black/55 text-white/85 backdrop-blur transition hover:bg-black/75"
              title="Cancelar"
              aria-label="Cancelar grabación"
            >
              <X className="size-4" />
            </button>
            {state !== 'recording' ? (
              <button
                type="button"
                onClick={handleToggleFacing}
                disabled={state !== 'idle'}
                className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/55 text-white/85 backdrop-blur transition hover:bg-black/75 disabled:opacity-50"
                title="Cambiar cámara"
                aria-label="Cambiar cámara"
              >
                <SwitchCamera className="size-4" />
              </button>
            ) : null}
          </>
        ) : null}

        {/* Recording timer */}
        {state === 'recording' ? (
          <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/55 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur">
            <span className="size-2 animate-pulse rounded-full bg-red-500" />
            {formatTimer(elapsedMs)} / {formatTimer(maxDurationMs)}
          </div>
        ) : null}

        {/* Bottom controls */}
        {state === 'idle' || state === 'recording' ? (
          <div className="absolute inset-x-0 bottom-5 flex items-center justify-center">
            <button
              type="button"
              onClick={state === 'recording' ? handleStop : handleStart}
              className="relative grid size-[88px] place-items-center"
              aria-label={state === 'recording' ? 'Detener grabación' : 'Iniciar grabación'}
            >
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 88 88" aria-hidden>
                <circle
                  cx="44"
                  cy="44"
                  r="38"
                  fill="none"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="4"
                />
                {state === 'recording' ? (
                  <circle
                    cx="44"
                    cy="44"
                    r="38"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    style={{ transition: 'stroke-dashoffset 100ms linear' }}
                  />
                ) : null}
              </svg>
              <span
                className={`grid place-items-center rounded-full bg-red-500 text-white shadow-[0_8px_28px_rgba(239,68,68,0.45)] transition-all duration-200 ${
                  state === 'recording' ? 'size-7 rounded-md' : 'size-16 rounded-full'
                }`}
              />
            </button>
          </div>
        ) : null}

        {state === 'idle' ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-[110px] text-center text-[11px] text-white/70">
            Toca para grabar hasta {maxSeconds} segundos
          </p>
        ) : null}
      </div>

      {state === 'preview' ? (
        <div className="flex flex-col-reverse gap-2 border-t border-white/14 bg-black/70 px-4 py-3 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="rounded-full text-white/80"
            onClick={handleRetake}
          >
            <RotateCcw className="size-4" />
            Volver a grabar
          </Button>
          <div className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full text-white/80"
              onClick={handleCancel}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className="rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white shadow-[0_4px_24px_rgba(168,85,247,0.35)] hover:brightness-110"
            >
              Usar este video
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
