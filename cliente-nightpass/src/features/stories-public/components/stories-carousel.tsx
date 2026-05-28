'use client';

import { useState } from 'react';
import { cn } from '@/core/lib/utils/cn';
import type { VenueStoriesGroup } from '@/core/types/api';
import { useActiveStories } from '../hooks/use-active-stories';
import { useViewedStories } from '../hooks/use-viewed-stories';
import { StoriesViewer } from './stories-viewer';

interface Props {
  initialGroups: VenueStoriesGroup[];
}

export function StoriesCarousel({ initialGroups }: Props) {
  const { data } = useActiveStories(initialGroups);
  const groups = data ?? initialGroups;
  const { allViewed } = useViewedStories();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (!groups || groups.length === 0) return null;

  return (
    <>
      <div
        className="np-stories-row -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        aria-label="Historias en vivo"
      >
        {groups.map((g, i) => {
          const ids = g.stories.map((s) => s.id);
          const everythingViewed = ids.length > 0 && allViewed(ids);
          const ringClass = everythingViewed
            ? 'bg-white/15'
            : 'bg-gradient-to-tr from-fuchsia-500 via-purple-500 to-pink-500';
          const initial = g.venueName.charAt(0).toUpperCase();
          return (
            <button
              key={g.venueId}
              type="button"
              onClick={() => setOpenIdx(i)}
              className="group flex w-[78px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label={`Ver historias de ${g.venueName}`}
            >
              <span
                className={cn(
                  'relative grid size-[72px] place-items-center rounded-full p-[2.5px] transition-transform duration-200 group-hover:scale-[1.04] group-active:scale-95',
                  ringClass,
                )}
              >
                <span className="size-[64px] overflow-hidden rounded-full border border-black/80 bg-black">
                  {g.venueCoverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.venueCoverImageUrl}
                      alt={g.venueName}
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
              <span className="mt-0.5 line-clamp-1 w-full text-center text-[11px] leading-tight text-white/70">
                {g.venueName}
              </span>
            </button>
          );
        })}
      </div>

      {openIdx != null && (
        <StoriesViewer
          groups={groups}
          initialVenueIndex={openIdx}
          onClose={() => setOpenIdx(null)}
        />
      )}
    </>
  );
}
