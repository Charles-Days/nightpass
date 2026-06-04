'use client';

import * as React from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import type { Story } from '@/core/types/api';
import { ConfirmDialog } from '@/core/components/ui/confirm-dialog';
import { CountdownPill } from './countdown-pill';
import { useDeleteStory } from '../hooks/use-delete-story';
import type { CreateStoryTarget } from '../hooks/use-create-story';

interface StoryCardProps {
  story: Story;
  target: CreateStoryTarget;
}

export function StoryCard({ story, target }: StoryCardProps) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const deleteStory = useDeleteStory(target.venueId ?? {});

  const isVideo = story.mediaType === 'VIDEO';

  const handleMouseEnter = () => {
    if (isVideo && videoRef.current) {
      videoRef.current.play().catch(() => undefined);
    }
  };
  const handleMouseLeave = () => {
    if (isVideo && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleConfirmDelete = () => {
    deleteStory.mutate(story.id, {
      onSuccess: () => setConfirmOpen(false),
    });
  };

  return (
    <>
      <div
        className="group relative aspect-square overflow-hidden rounded-[18px] border border-white/14 bg-white/[0.05]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={`${story.mediaUrl}#t=0.1`}
            muted
            loop
            playsInline
            preload="metadata"
            className="size-full object-cover"
            onLoadedMetadata={(e) => {
              try {
                e.currentTarget.currentTime = 0.1;
              } catch {
                // ignore
              }
            }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.mediaUrl}
            alt={story.caption ?? 'Historia'}
            className="size-full object-cover"
          />
        )}

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={deleteStory.isPending}
          title="Eliminar historia"
          className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/60 text-white/85 backdrop-blur transition hover:bg-red-500/80 hover:text-white disabled:opacity-60"
        >
          {deleteStory.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
        </button>

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2.5">
          <CountdownPill expiresAt={story.expiresAt} />
        </div>

        {story.caption ? (
          <div className="absolute left-2.5 top-2.5 max-w-[60%] rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-white/85 backdrop-blur">
            <span className="line-clamp-1">{story.caption}</span>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(v) => !deleteStory.isPending && setConfirmOpen(v)}
        title="¿Eliminar esta historia?"
        description="Se borrará del muro y del almacenamiento. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="destructive"
        loading={deleteStory.isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
