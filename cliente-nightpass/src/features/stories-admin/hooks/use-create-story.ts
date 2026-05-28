'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';
import { clientFetch } from '@/core/lib/api/client-client';
import type { Story, StoryMediaType, StoryUploadInit } from '@/core/types/api';
import { MAX_VIDEO_DURATION_MS, probeVideoDurationMs } from '../lib/media-utils';
import { transcodeToH264 } from '../lib/transcode-video';

export type CreateStoryPhase =
  | 'idle'
  | 'transcoding'
  | 'signing'
  | 'uploading'
  | 'creating';

interface CreateStoryInput {
  file: File;
  mediaType: StoryMediaType;
  durationMs?: number;
  caption?: string;
  /** Set true when validateAndPrepare flagged the file (HEVC / >25MB). */
  needsTranscode?: boolean;
}

interface UseCreateStoryOptions {
  onSuccess?: (story: Story) => void;
}

export type CreateStoryTarget =
  | { venueId: string; eventId?: undefined }
  | { eventId: string; venueId?: undefined };

export function useCreateStory(
  targetOrVenueId: string | CreateStoryTarget,
  options: UseCreateStoryOptions = {},
) {
  const target: CreateStoryTarget =
    typeof targetOrVenueId === 'string' ? { venueId: targetOrVenueId } : targetOrVenueId;
  const venueId = target.venueId;
  const eventId = target.eventId;
  const invalidationKey = venueId
    ? ['stories-mine', venueId]
    : ['stories-mine-event', eventId!];
  const qc = useQueryClient();
  const router = useRouter();

  const [phase, setPhase] = React.useState<CreateStoryPhase>('idle');
  const [transcodeProgress, setTranscodeProgress] = React.useState(0);

  const mutation = useMutation({
    mutationFn: async ({
      file,
      mediaType,
      durationMs: inputDurationMs,
      caption,
      needsTranscode,
    }: CreateStoryInput) => {
      let uploadFile = file;
      let durationMs = inputDurationMs;

      if (mediaType === 'VIDEO' && needsTranscode) {
        setPhase('transcoding');
        setTranscodeProgress(0);
        try {
          uploadFile = await transcodeToH264(file, (pct) => setTranscodeProgress(pct));
        } catch (err) {
          console.error('[stories] transcode failed', err);
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(`Optimización del video falló: ${msg.slice(0, 120)}`);
        }

        // Re-probe duration on the transcoded result (may differ slightly).
        try {
          const p = await probeVideoDurationMs(uploadFile);
          if (p.durationMs > 0) durationMs = p.durationMs;
        } catch {
          // If the transcoded file still can't be probed, fall back to the input duration.
        }

        if (durationMs && durationMs > MAX_VIDEO_DURATION_MS) {
          throw new Error('El video supera el máximo de 15 segundos.');
        }
      }

      setPhase('signing');
      const baseContentType = (uploadFile.type || 'application/octet-stream').split(';')[0].trim();
      const init = await clientFetch<StoryUploadInit>('/api/stories/upload-init', {
        method: 'POST',
        body: {
          ...(venueId ? { venueId } : { eventId }),
          mediaType,
          contentType: baseContentType,
          sizeBytes: uploadFile.size,
        },
      });

      setPhase('uploading');
      const putRes = await fetch(init.signedUrl, {
        method: 'PUT',
        body: uploadFile,
        headers: { 'Content-Type': baseContentType },
      });
      if (!putRes.ok) {
        throw new Error('No pudimos subir el archivo a R2.');
      }

      setPhase('creating');
      const story = await clientFetch<Story>('/api/stories', {
        method: 'POST',
        body: {
          ...(venueId ? { venueId } : { eventId }),
          mediaUrl: init.publicUrl,
          mediaType,
          durationMs,
          caption: caption || undefined,
        },
      });
      return story;
    },
    onSuccess: (story) => {
      toast.success('Historia publicada');
      qc.invalidateQueries({ queryKey: invalidationKey });
      router.refresh();
      setPhase('idle');
      setTranscodeProgress(0);
      options.onSuccess?.(story);
    },
    onError: (err) => {
      console.error('[stories] publish failed', err);
      const message = err instanceof Error ? err.message : 'No pudimos publicar la historia.';
      toast.error(message);
      setPhase('idle');
      setTranscodeProgress(0);
    },
  });

  return {
    ...mutation,
    phase,
    transcodeProgress,
  };
}
