'use client';

import { useState } from 'react';
import { cn } from '@/core/lib/utils/cn';
import type { Story, VenueStoriesGroup } from '@/core/types/api';
import { useVenueStories } from '../hooks/use-venue-stories';
import { useViewedStories } from '../hooks/use-viewed-stories';
import { StoriesViewer } from './stories-viewer';

type Size = 'sm' | 'md' | 'lg';

interface Props {
  slug: string;
  venueName: string;
  coverImageUrl?: string | null;
  stories?: Story[];
  size?: Size;
  hideIfEmpty?: boolean;
  showLabel?: boolean;
  onOpen?: () => void;
}

const SIZE_OUTER: Record<Size, string> = {
  sm: 'size-14',
  md: 'size-[72px]',
  lg: 'size-20',
};

const SIZE_INNER: Record<Size, string> = {
  sm: 'size-[50px]',
  md: 'size-[64px]',
  lg: 'size-[72px]',
};

export function StoryRing({
  slug,
  venueName,
  coverImageUrl,
  stories: providedStories,
  size = 'md',
  hideIfEmpty = false,
  showLabel = false,
  onOpen,
}: Props) {
  const enabled = providedStories === undefined;
  const query = useVenueStories(enabled ? slug : null);
  const stories = providedStories ?? query.data ?? [];

  const { allViewed } = useViewedStories();
  const [open, setOpen] = useState(false);

  const hasStories = stories.length > 0;
  const ids = stories.map((s) => s.id);
  const everythingViewed = hasStories && allViewed(ids);

  if (!hasStories && hideIfEmpty) return null;

  const initial = venueName.charAt(0).toUpperCase();

  const ringClass = !hasStories
    ? 'bg-transparent'
    : everythingViewed
      ? 'bg-white/15'
      : 'bg-gradient-to-tr from-fuchsia-500 via-purple-500 to-pink-500';

  const handleClick = () => {
    if (!hasStories) return;
    onOpen?.();
    setOpen(true);
  };

  const groups: VenueStoriesGroup[] = hasStories
    ? [
        {
          venueId: stories[0]!.venueId,
          venueSlug: slug,
          venueName,
          venueCoverImageUrl: coverImageUrl ?? null,
          stories,
        },
      ]
    : [];

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={!hasStories}
        className={cn(
          'group flex flex-col items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-full',
          !hasStories && 'cursor-default',
        )}
        aria-label={
          hasStories ? `Ver historias de ${venueName}` : `${venueName} (sin historias)`
        }
      >
        <span
          className={cn(
            'relative grid place-items-center rounded-full p-[2.5px] transition-transform duration-200',
            SIZE_OUTER[size],
            ringClass,
            hasStories && 'group-hover:scale-[1.04] group-active:scale-95',
          )}
        >
          <span
            className={cn(
              'overflow-hidden rounded-full border border-black/80 bg-black',
              SIZE_INNER[size],
            )}
          >
            {coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImageUrl}
                alt={venueName}
                className="size-full object-cover"
                draggable={false}
              />
            ) : (
              <span className="grid size-full place-items-center bg-gradient-to-br from-purple-900/60 to-purple-600/20 font-display text-base font-bold text-white/85">
                {initial}
              </span>
            )}
          </span>
        </span>
        {showLabel && (
          <span className="mt-1.5 line-clamp-1 max-w-[80px] text-center text-[11px] text-white/70">
            {venueName}
          </span>
        )}
      </button>

      {open && hasStories && (
        <StoriesViewer
          groups={groups}
          initialVenueIndex={0}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
