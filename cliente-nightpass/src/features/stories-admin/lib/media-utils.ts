'use client';

import type { StoryMediaType } from '@/core/types/api';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
export const MAX_VIDEO_DURATION_MS = 15_000;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const ACCEPT_ATTR = 'image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm';

export function detectMediaType(file: File): StoryMediaType | null {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'IMAGE';
  if (ACCEPTED_VIDEO_TYPES.includes(file.type)) return 'VIDEO';
  if (file.type.startsWith('image/')) return 'IMAGE';
  if (file.type.startsWith('video/')) return 'VIDEO';
  return null;
}

export interface ValidatedMedia {
  file: File;
  mediaType: StoryMediaType;
  durationMs?: number;
  previewUrl: string;
  /** true when codec is unplayable in this browser OR file is large enough to require compression. */
  needsTranscode: boolean;
  /** true if browser can actually decode the file (used to decide if we can show preview directly). */
  playable: boolean;
}

export const TRANSCODE_SIZE_THRESHOLD_BYTES = 25 * 1024 * 1024;

export interface VideoProbeResult {
  durationMs: number;
  playable: boolean;
}

export async function probeVideoDurationMs(file: File): Promise<VideoProbeResult> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
    };
    video.onloadedmetadata = () => {
      const ms = Math.round((video.duration || 0) * 1000);
      const playable = video.videoWidth > 0 && video.videoHeight > 0;
      cleanup();
      resolve({ durationMs: ms, playable });
    };
    video.onerror = () => {
      cleanup();
      reject(new Error('UNREADABLE_CODEC'));
    };
    video.src = url;
  });
}

export async function validateAndPrepare(file: File): Promise<ValidatedMedia> {
  const mediaType = detectMediaType(file);
  if (!mediaType) {
    throw new Error('Formato no permitido. Usa JPG, PNG, WebP, MP4 o WebM.');
  }

  if (mediaType === 'IMAGE') {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error('La imagen supera el máximo de 10 MB.');
    }
    return {
      file,
      mediaType,
      previewUrl: URL.createObjectURL(file),
      needsTranscode: false,
      playable: true,
    };
  }

  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error('El video supera el máximo de 200 MB.');
  }

  let probed: VideoProbeResult | null = null;
  let playable = false;
  try {
    probed = await probeVideoDurationMs(file);
    playable = probed.playable;
  } catch (err) {
    if (err instanceof Error && err.message === 'UNREADABLE_CODEC') {
      // Codec unreadable in this browser (typical for HEVC from iPhone).
      // Don't throw — we'll transcode in the pipeline.
      playable = false;
    } else {
      throw err;
    }
  }

  // Only enforce the 15s cap when we could actually read the duration AND the file is playable.
  // If it's not playable we'll re-probe after transcoding inside the upload hook.
  if (probed && playable && probed.durationMs > MAX_VIDEO_DURATION_MS) {
    throw new Error('El video supera el máximo de 15 segundos.');
  }

  const needsTranscode = !playable || file.size > TRANSCODE_SIZE_THRESHOLD_BYTES;

  return {
    file,
    mediaType,
    durationMs: probed?.durationMs,
    // Preview only works when the browser can decode the file; otherwise the uploader UI
    // will render a placeholder until the transcoded blob is ready.
    previewUrl: playable ? URL.createObjectURL(file) : '',
    needsTranscode,
    playable,
  };
}

export function formatRemaining(expiresAt: string, now: number = Date.now()): string {
  const diffMs = new Date(expiresAt).getTime() - now;
  if (diffMs <= 0) return 'Expirada';
  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) {
    return `${minutes}m restantes`;
  }
  return `${hours}h ${minutes}m restantes`;
}
