'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import type { Story } from '@/core/types/api';

interface Props {
  story: Story;
  paused: boolean;
  muted?: boolean;
  onReady: () => void;
  onEnded: () => void;
  onVideoTimeUpdate?: (currentMs: number, durationMs: number) => void;
}

export function StoryMedia({
  story,
  paused,
  muted = true,
  onReady,
  onEnded,
  onVideoTimeUpdate,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) {
      v.pause();
    } else {
      v.play().catch(() => {});
    }
  }, [paused]);

  // El prop `muted` de React no siempre se refleja en el elemento; lo aplicamos
  // por ref. Arranca muted (autoplay del navegador lo exige) y el usuario
  // activa el sonido con el botón del viewer.
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted, story.id]);

  // rAF-driven progress: HTMLVideoElement.onTimeUpdate fires only ~4x/sec,
  // causing choppy progress bar. Read currentTime directly each frame.
  useEffect(() => {
    if (story.mediaType !== 'VIDEO') return;
    if (!onVideoTimeUpdate) return;
    const v = videoRef.current;
    if (!v) return;

    let cancelled = false;
    const loop = () => {
      if (cancelled) return;
      const el = videoRef.current;
      if (el && el.duration > 0 && !el.paused) {
        onVideoTimeUpdate(el.currentTime * 1000, el.duration * 1000);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [story.id, story.mediaType, onVideoTimeUpdate]);

  if (story.mediaType === 'VIDEO') {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        ref={videoRef}
        src={story.mediaUrl}
        autoPlay
        muted
        playsInline
        preload="auto"
        className="size-full object-contain"
        onLoadedData={onReady}
        onEnded={onEnded}
      />
    );
  }

  return (
    <Image
      src={story.mediaUrl}
      alt={story.caption ?? ''}
      fill
      sizes="100vw"
      priority
      className="object-contain"
      onLoad={onReady}
      draggable={false}
    />
  );
}
