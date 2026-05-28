'use client';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

type ProgressCb = (pct: number) => void;

let ffmpegSingleton: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

// Self-hosted in /public/ffmpeg/ to bypass Turbopack's new URL(import.meta.url) bug.
const CORE_BASE_URL = '/ffmpeg';

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegSingleton) return ffmpegSingleton;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const ff = new FFmpeg();
    await ff.load({
      coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
      classWorkerURL: await toBlobURL(`${CORE_BASE_URL}/worker.js`, 'text/javascript'),
    });
    ffmpegSingleton = ff;
    return ff;
  })();
  return loadPromise;
}

/**
 * Transcodes any input video to H.264 + AAC MP4 capped at 1080p with ~2Mbps bitrate.
 * Returns a new File (Chrome/Firefox/Safari/iOS all playable).
 */
export async function transcodeToH264(file: File, onProgress?: ProgressCb): Promise<File> {
  const ff = await getFFmpeg();
  const inputName = 'input.bin';
  const outputName = 'output.mp4';

  if (onProgress) {
    ff.on('progress', (e) => onProgress(Math.min(99, Math.round((e.progress ?? 0) * 100))));
  }

  await ff.writeFile(inputName, await fetchFile(file));
  await ff.exec([
    '-i', inputName,
    '-vf', "scale='min(1080,iw)':'min(1920,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '26',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ac', '2',
    outputName,
  ]);

  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);
  if (onProgress) onProgress(100);

  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const blob = new Blob([bytes as BlobPart], { type: 'video/mp4' });
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'video';
  return new File([blob], `${baseName}.mp4`, { type: 'video/mp4' });
}

/**
 * Decides whether the file should be transcoded before upload:
 * - Always transcode if size > 25 MB (e.g. iPhone 4K). Compresses regardless of codec.
 * - Transcode if `<video>` element fails to read metadata (codec unsupported by browser).
 * - Otherwise pass through.
 */
export async function needsTranscoding(file: File, playable: boolean): Promise<boolean> {
  if (!playable) return true;
  if (file.size > 25 * 1024 * 1024) return true;
  return false;
}
