'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Camera, Image as ImageIcon, Loader2, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import { paths } from '@/core/config/paths';
import { useCreateStory } from '../hooks/use-create-story';
import { MAX_IMAGE_BYTES, MAX_VIDEO_DURATION_MS, type ValidatedMedia } from '../lib/media-utils';
import { StoryRecorder } from './story-recorder';

interface OwnerStoryComposerProps {
  venueId: string;
  venueName: string;
  autoStart?: 'record' | 'photo' | null;
  returnTo?: 'app' | 'profile' | null;
}

type Mode = 'idle' | 'record' | 'preview';

export function OwnerStoryComposer({ venueId, venueName, autoStart = null, returnTo = null }: OwnerStoryComposerProps) {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>('idle');
  const [media, setMedia] = React.useState<ValidatedMedia | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const autoStartedRef = React.useRef(false);

  const create = useCreateStory(venueId, {
    onSuccess: () => {
      reset();
    },
  });

  // Auto-open record/photo flow when navigated with ?compose=record|photo.
  React.useEffect(() => {
    if (autoStartedRef.current || !autoStart) return;
    autoStartedRef.current = true;
    if (autoStart === 'record') {
      setMode('record');
    } else if (autoStart === 'photo') {
      setTimeout(() => photoInputRef.current?.click(), 50);
    }
  }, [autoStart]);

  React.useEffect(() => {
    const overlayOpen = mode === 'record' || mode === 'preview';
    if (!overlayOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mode]);

  const { phase, transcodeProgress } = create;

  const reset = React.useCallback(() => {
    setMedia((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
    setMode('idle');
    if (photoInputRef.current) photoInputRef.current.value = '';
    // If we arrived from the customer app (e.g. ?return=app|profile), bounce
    // the user back there so the composer never strands them in /mi-local/*.
    if (returnTo === 'app') {
      router.push(paths.appHome);
    } else if (returnTo === 'profile') {
      router.push(paths.perfil);
    }
  }, [returnTo, router]);

  const handlePhotoFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona una imagen (JPG, PNG, WebP o HEIC).');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('La imagen supera el máximo de 10 MB.');
      return;
    }
    setMedia({
      file,
      mediaType: 'IMAGE',
      previewUrl: URL.createObjectURL(file),
      needsTranscode: false,
      playable: true,
    });
    setMode('preview');
  };

  const handleRecorded = (file: File, durationMs: number) => {
    setMedia({
      file,
      mediaType: 'VIDEO',
      durationMs: Math.min(durationMs, MAX_VIDEO_DURATION_MS),
      previewUrl: URL.createObjectURL(file),
      needsTranscode: false,
      playable: true,
    });
    setMode('preview');
  };

  const handlePublish = () => {
    if (!media || create.isPending) return;
    create.mutate({
      file: media.file,
      mediaType: media.mediaType,
      durationMs: media.durationMs,
      needsTranscode: media.needsTranscode,
    });
  };

  const isBusy = create.isPending;
  const busyLabel =
    phase === 'transcoding'
      ? `Optimizando ${transcodeProgress}%`
      : phase === 'uploading'
        ? 'Subiendo…'
        : phase === 'creating'
          ? 'Publicando…'
          : phase === 'signing'
            ? 'Preparando…'
            : 'Publicando…';

  const overlay = (mode === 'record' || (mode === 'preview' && media)) ? (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* Safe-area top padding */}
      <div className="shrink-0" style={{ paddingTop: 'env(safe-area-inset-top, 0)' }} />

      {mode === 'record' && (
        <div className="relative flex-1 overflow-hidden">
          <StoryRecorder
            onRecorded={handleRecorded}
            onCancel={reset}
            maxDurationMs={MAX_VIDEO_DURATION_MS}
            fill
          />
        </div>
      )}

      {mode === 'preview' && media && (
        <>
          <div className="relative flex-1 overflow-hidden bg-black">
            {media.mediaType === 'IMAGE' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media.previewUrl}
                alt="Vista previa"
                className="size-full object-contain"
              />
            ) : (
              <video
                src={media.previewUrl}
                className="size-full object-contain"
                autoPlay
                loop
                muted
                playsInline
                controls
              />
            )}
            <button
              type="button"
              onClick={reset}
              disabled={isBusy}
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition active:scale-95 disabled:opacity-50"
              aria-label="Descartar"
            >
              <X className="size-5" />
            </button>
            <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary backdrop-blur">
              {venueName}
            </div>
          </div>

          <div
            className="shrink-0 border-t border-white/10 bg-black/95 p-4 backdrop-blur"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 1rem)' }}
          >
            <Button
              onClick={handlePublish}
              disabled={isBusy}
              className="h-12 w-full rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[0_8px_24px_-6px_rgba(168,85,247,0.55)] hover:from-[#7e22ce] hover:to-[#9333ea]"
            >
              {isBusy ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {busyLabel}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Publicar historia
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  ) : null;

  return (
    <>
      {overlay && typeof document !== 'undefined' ? createPortal(overlay, document.body) : null}
      <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
        {venueName}
      </p>
      <h2 className="mt-1 font-display text-lg font-semibold tracking-tight">
        Nueva historia
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Graba un video corto o sube una foto del local. Caduca a las 24h.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode('record')}
          className="group flex flex-col items-center justify-center gap-3 rounded-[18px] border border-white/10 bg-gradient-to-br from-purple-500/15 via-fuchsia-500/10 to-pink-500/15 p-6 transition hover:border-primary/40 hover:from-purple-500/25 hover:via-fuchsia-500/20 hover:to-pink-500/25 active:scale-[0.98]"
        >
          <div className="grid size-14 place-items-center rounded-full bg-gradient-to-tr from-fuchsia-500 via-purple-500 to-pink-500 text-white shadow-[0_8px_24px_-6px_rgba(168,85,247,0.55)] transition group-hover:scale-105">
            <Camera className="size-7" />
          </div>
          <div className="text-center">
            <p className="font-display text-base font-semibold text-white">Grabar historia</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Video corto · máx {MAX_VIDEO_DURATION_MS / 1000}s
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="group flex flex-col items-center justify-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/25 hover:bg-white/[0.06] active:scale-[0.98]"
        >
          <div className="grid size-14 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-primary transition group-hover:bg-white/[0.1]">
            <ImageIcon className="size-7" />
          </div>
          <div className="text-center">
            <p className="font-display text-base font-semibold text-white">Subir foto</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Desde tu galería · máx 10 MB
            </p>
          </div>
        </button>

        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={(e) => handlePhotoFile(e.target.files?.[0])}
        />
      </div>
      </div>
    </>
  );
}
