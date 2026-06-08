'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Volume2, VolumeX, X } from 'lucide-react';
import type { VenueStoriesGroup } from '@/core/types/api';
import { StoryProgressBars } from './story-progress-bars';
import { StoryMedia } from './story-media';
import { useViewedStories } from '../hooks/use-viewed-stories';

interface Props {
  groups: VenueStoriesGroup[];
  initialVenueIndex: number;
  initialStoryIndex?: number;
  onClose: () => void;
}

const IMAGE_DEFAULT_MS = 5000;
const MAX_DURATION_MS = 15000;
const PROGRESS_TICK_MS = 60;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export function StoriesViewer({
  groups,
  initialVenueIndex,
  initialStoryIndex = 0,
  onClose,
}: Props) {
  const [venueIdx, setVenueIdx] = useState(initialVenueIndex);
  const [storyIdx, setStoryIdx] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const { markViewed } = useViewedStories();

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const requestClose = useCallback(() => {
    setClosing(true);
    setOpen(false);
    setTimeout(() => onClose(), 220);
  }, [onClose]);

  const currentGroup = groups[venueIdx];
  const currentStory = currentGroup?.stories[storyIdx];

  const targetDurationMs = useMemo(() => {
    if (!currentStory) return IMAGE_DEFAULT_MS;
    if (currentStory.mediaType === 'IMAGE') return IMAGE_DEFAULT_MS;
    const raw = currentStory.durationMs ?? IMAGE_DEFAULT_MS;
    return Math.min(MAX_DURATION_MS, Math.max(1000, raw));
  }, [currentStory]);

  const goNext = useCallback(() => {
    if (!currentGroup) return;
    if (currentStory) markViewed(currentStory.id);
    if (storyIdx + 1 < currentGroup.stories.length) {
      setStoryIdx((s) => s + 1);
      setProgress(0);
      setReady(false);
      return;
    }
    if (venueIdx + 1 < groups.length) {
      setVenueIdx((v) => v + 1);
      setStoryIdx(0);
      setProgress(0);
      setReady(false);
      return;
    }
    requestClose();
  }, [currentGroup, currentStory, storyIdx, venueIdx, groups.length, markViewed, requestClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((s) => s - 1);
      setProgress(0);
      setReady(false);
      return;
    }
    if (venueIdx > 0) {
      const prevGroup = groups[venueIdx - 1];
      setVenueIdx((v) => v - 1);
      setStoryIdx(Math.max(0, (prevGroup?.stories.length ?? 1) - 1));
      setProgress(0);
      setReady(false);
      return;
    }
    setProgress(0);
  }, [storyIdx, venueIdx, groups]);

  // Auto-advance for images (and as fallback for video while ready)
  const startedAtRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    accumulatedRef.current = 0;
    startedAtRef.current = null;
  }, [venueIdx, storyIdx]);

  useEffect(() => {
    if (!currentStory) return;
    if (currentStory.mediaType === 'VIDEO') return;
    if (!ready) return;
    if (paused) {
      if (startedAtRef.current != null) {
        accumulatedRef.current += Date.now() - startedAtRef.current;
        startedAtRef.current = null;
      }
      return;
    }

    startedAtRef.current = Date.now();
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const now = Date.now();
      const elapsed = accumulatedRef.current + (now - (startedAtRef.current ?? now));
      const pct = Math.min(100, (elapsed / targetDurationMs) * 100);
      setProgress(pct);
      if (pct >= 100) {
        goNext();
        return;
      }
      rafRef.current = window.requestAnimationFrame(tick) as unknown as number;
    };
    tick();

    return () => {
      cancelled = true;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [currentStory, ready, paused, targetDurationMs, goNext]);

  // Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose, goNext, goPrev]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Touch swipe-down to close
  const touchStartY = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
    setPaused(true);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const startY = touchStartY.current;
    touchStartY.current = null;
    setPaused(false);
    if (startY == null) return;
    const endY = e.changedTouches[0]?.clientY ?? startY;
    if (endY - startY > 80) requestClose();
  };

  if (!currentGroup || !currentStory) {
    return null;
  }

  const onTapZone = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (x < third) goPrev();
    else if (x > rect.width - third) goNext();
    else setPaused((p) => !p);
  };

  const venueInitial = currentGroup.venueName.charAt(0).toUpperCase();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black transition-opacity duration-200 ease-out ${
        open && !closing ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Visor de historias"
    >
      <div
        className={`relative size-full max-w-md overflow-hidden bg-black transform-gpu transition-all duration-200 ease-out sm:max-h-[100dvh] ${
          open && !closing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="absolute inset-0">
          <StoryMedia
            story={currentStory}
            paused={paused}
            muted={muted}
            onReady={() => setReady(true)}
            onEnded={goNext}
            onVideoTimeUpdate={(curMs, durMs) => {
              const cap = Math.min(MAX_DURATION_MS, durMs);
              const pct = Math.min(100, (curMs / cap) * 100);
              setProgress(pct);
            }}
          />
        </div>

        <StoryProgressBars
          total={currentGroup.stories.length}
          currentIndex={storyIdx}
          currentProgress={progress}
        />

        {/* Header */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent px-3 pb-6 pt-7">
          <div className="pointer-events-auto mt-2 flex items-center gap-3">
            <div className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/22 bg-white/10">
              {currentGroup.venueCoverImageUrl ? (
                <Image
                  src={currentGroup.venueCoverImageUrl}
                  alt={currentGroup.venueName}
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              ) : (
                <span className="font-display text-sm font-semibold text-white">
                  {venueInitial}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold text-white">
                {currentGroup.venueName}
              </p>
              <p className="text-[11px] text-white/65">{timeAgo(currentStory.createdAt)}</p>
            </div>
            {currentStory.mediaType === 'VIDEO' && (
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="grid size-9 place-items-center rounded-full bg-white/10 text-white transition active:scale-95"
                aria-label={muted ? 'Activar sonido' : 'Silenciar'}
              >
                {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </button>
            )}
            <button
              type="button"
              onClick={requestClose}
              className="grid size-9 place-items-center rounded-full bg-white/10 text-white transition active:scale-95"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Tap zones */}
        <div
          className="absolute inset-0 z-[5]"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onClick={onTapZone}
        />

        {/* Caption */}
        {currentStory.caption && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 to-transparent px-5 pb-7 pt-12">
            <p className="text-sm leading-relaxed text-white">{currentStory.caption}</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
