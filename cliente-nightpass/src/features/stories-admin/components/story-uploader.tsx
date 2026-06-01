'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Camera, FileVideo, Loader2, Radio, Sparkles, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import { Textarea } from '@/core/components/ui/textarea';
import { paths } from '@/core/config/paths';
import { useCreateStory, type CreateStoryTarget } from '../hooks/use-create-story';
import {
  ACCEPT_ATTR,
  MAX_VIDEO_DURATION_MS,
  type ValidatedMedia,
  validateAndPrepare,
} from '../lib/media-utils';
import { StoryRecorder } from './story-recorder';

type UploaderMode = 'pick' | 'record';

interface StoryUploaderProps {
  target: CreateStoryTarget;
  title: string;
  /** Deep-link desde la app móvil: arranca grabando o abre selector de archivo. */
  autoStart?: 'record' | 'photo' | null;
  /** Tras publicar/cancelar, rebota al cliente de donde vino. */
  returnTo?: 'app' | 'profile' | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StoryUploader({ target, title, autoStart = null, returnTo = null }: StoryUploaderProps) {
  const router = useRouter();
  const [media, setMedia] = React.useState<ValidatedMedia | null>(null);
  const [caption, setCaption] = React.useState('');
  const [dragOver, setDragOver] = React.useState(false);
  const [validating, setValidating] = React.useState(false);
  const [mode, setMode] = React.useState<UploaderMode>(autoStart === 'record' ? 'record' : 'pick');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const autoStartedRef = React.useRef(false);

  const create = useCreateStory(target, {
    onSuccess: () => {
      reset();
      if (returnTo === 'app') router.push(paths.appHome);
      else if (returnTo === 'profile') router.push(paths.perfil);
    },
  });

  const { phase, transcodeProgress } = create;

  const reset = React.useCallback(() => {
    setMedia((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
    setCaption('');
    setMode('pick');
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  // Deep-link ?compose=photo → abre el selector de archivo al montar.
  React.useEffect(() => {
    if (autoStartedRef.current || autoStart !== 'photo') return;
    autoStartedRef.current = true;
    const t = setTimeout(() => inputRef.current?.click(), 50);
    return () => clearTimeout(t);
  }, [autoStart]);

  const handleRecorded = React.useCallback(
    (file: File, durationMs: number) => {
      if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl);
      const safeDuration = durationMs > 0 ? Math.min(durationMs, MAX_VIDEO_DURATION_MS) : undefined;
      setMedia({
        file,
        mediaType: 'VIDEO',
        durationMs: safeDuration,
        previewUrl: URL.createObjectURL(file),
        needsTranscode: false,
        playable: true,
      });
      setMode('pick');
    },
    [media?.previewUrl],
  );

  React.useEffect(() => {
    return () => {
      if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = async (file: File) => {
    setValidating(true);
    try {
      if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl);
      const validated = await validateAndPrepare(file);
      setMedia(validated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Archivo no válido.';
      toast.error(message);
    } finally {
      setValidating(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    void handleFile(files[0]);
  };

  const handlePublish = () => {
    if (!media || create.isPending) return;
    create.mutate({
      file: media.file,
      mediaType: media.mediaType,
      durationMs: media.durationMs,
      caption: caption.trim() || undefined,
      needsTranscode: media.needsTranscode,
    });
  };

  const isBusy = create.isPending || validating;
  const maxVideoSeconds = Math.round(MAX_VIDEO_DURATION_MS / 1000);

  const phaseLabel: Record<typeof phase, string> = {
    idle: '',
    transcoding: `Optimizando video… ${transcodeProgress}%`,
    signing: 'Preparando subida…',
    uploading: 'Subiendo archivo…',
    creating: 'Publicando historia…',
  };

  const phaseProgressPct: Record<typeof phase, number> = {
    idle: 5,
    transcoding: Math.max(5, Math.min(60, Math.round(transcodeProgress * 0.6))),
    signing: 65,
    uploading: 85,
    creating: 96,
  };

  const showVideoPlaceholder =
    media?.mediaType === 'VIDEO' && (!media.previewUrl || !media.playable);

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
          <Radio className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            {title}
          </p>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Publicar historia
          </h2>
          <p className="text-xs text-muted-foreground">
            Imagen hasta 10 MB · video hasta 200 MB y {maxVideoSeconds}s.
          </p>
          <p className="mt-1.5 text-[11px] text-muted-foreground/75">
            Los videos de iPhone se optimizan automáticamente para que se vean en todos los navegadores.
          </p>
        </div>
      </div>

      {!media ? (
        <div className="space-y-3">
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setMode('pick')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                mode === 'pick'
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white/85'
              }`}
            >
              <UploadCloud className="size-3.5" />
              Subir archivo
            </button>
            <button
              type="button"
              onClick={() => setMode('record')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                mode === 'record'
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white/85'
              }`}
            >
              <Camera className="size-3.5" />
              Grabar
            </button>
          </div>

          {mode === 'record' ? (
            <StoryRecorder
              maxDurationMs={MAX_VIDEO_DURATION_MS}
              onRecorded={handleRecorded}
              onCancel={() => setMode('pick')}
            />
          ) : (
            <label
              htmlFor="story-file-input"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[18px] border-2 border-dashed px-6 py-10 text-center transition ${
                dragOver
                  ? 'border-primary/60 bg-primary/10'
                  : 'border-white/15 bg-white/[0.015] hover:border-white/25 hover:bg-white/[0.04]'
              }`}
            >
              <div className="grid size-12 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
                {validating ? (
                  <Loader2 className="size-5 animate-spin text-primary" />
                ) : (
                  <UploadCloud className="size-5 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white/85">
                  {validating ? 'Validando archivo…' : 'Arrastra una foto o video aquí'}
                </p>
                <p className="text-xs text-muted-foreground">
                  o haz click para elegir desde tu dispositivo.
                </p>
              </div>
              <input
                ref={inputRef}
                id="story-file-input"
                type="file"
                accept={ACCEPT_ATTR}
                className="hidden"
                disabled={validating}
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-[18px] border border-white/10 bg-black">
            <div className="aspect-[9/16] max-h-[480px] w-full">
              {media.mediaType === 'VIDEO' ? (
                showVideoPlaceholder ? (
                  <div className="flex size-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-black via-black to-purple-950/40 px-6 text-center">
                    <div className="grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-primary">
                      {phase === 'transcoding' ? (
                        <Loader2 className="size-6 animate-spin" />
                      ) : (
                        <FileVideo className="size-6" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="line-clamp-2 text-sm font-medium text-white/85">
                        {media.file.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatBytes(media.file.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                      <Sparkles className="size-3" />
                      {phase === 'transcoding'
                        ? `Optimizando ${transcodeProgress}%`
                        : 'Se optimizará automáticamente'}
                    </div>
                  </div>
                ) : (
                  <video
                    src={media.previewUrl}
                    className="size-full object-contain"
                    controls
                    muted
                    playsInline
                  />
                )
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={media.previewUrl}
                  alt="Vista previa"
                  className="size-full object-contain"
                />
              )}
            </div>
            <button
              type="button"
              onClick={reset}
              disabled={isBusy}
              className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/60 text-white/85 backdrop-blur transition hover:bg-black/80 disabled:opacity-60"
              title="Quitar archivo"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {media.mediaType === 'VIDEO' && media.needsTranscode && phase === 'idle' ? (
            <div className="flex items-start gap-2 rounded-2xl border border-primary/20 bg-primary/[0.06] px-4 py-3 text-xs text-white/80">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <p>
                Tu video se va a optimizar antes de subir (toma unos segundos). Esto lo hace
                visible en todos los navegadores y reduce tu consumo de datos.
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="story-caption" className="text-xs font-medium text-white/70">
              Texto opcional
            </label>
            <Textarea
              id="story-caption"
              rows={2}
              maxLength={280}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Cuenta qué está pasando en tu local…"
              disabled={isBusy}
              className="resize-none"
            />
            <p className="text-right text-[11px] text-muted-foreground">
              {caption.length}/280
            </p>
          </div>

          {create.isPending ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-white/80">
                <Loader2 className="size-4 animate-spin text-primary" />
                {phaseLabel[phase]}
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] transition-[width] duration-300 ${
                    phase === 'transcoding' ? '' : 'animate-pulse'
                  }`}
                  style={{
                    width: `${phaseProgressPct[phase]}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={reset}
              disabled={isBusy}
              className="rounded-full"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handlePublish}
              disabled={isBusy}
              className="rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white shadow-[0_4px_24px_rgba(168,85,247,0.35)] hover:brightness-110"
            >
              {create.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Publicando…
                </>
              ) : (
                'Publicar'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
