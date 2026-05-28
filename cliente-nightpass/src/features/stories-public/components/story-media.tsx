'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import type { Story } from '@/core/types/api';

interface Props {
  story: Story;
  paused: boolean;
  onReady: () => void;
  onEnded: () => void;
  onVideoTimeUpdate?: (currentMs: number, durationMs: number) => void;
}

export function StoryMedia({ story, paused, onReady, onEnded, onVideoTimeUpdate }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) {
      v.pause();
    } else {
      v.play().catch(() => {});
    }
  }, [paused]);

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
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (onVideoTimeUpdate && el.duration > 0) {
            onVideoTimeUpdate(el.currentTime * 1000, el.duration * 1000);
          }
        }}
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
