'use client';

import * as React from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import type { Story, VenueStoriesGroup } from '@/core/types/api';
import { StoriesViewer } from '@/features/stories-public/components/stories-viewer';
import { useViewedStories } from '@/features/stories-public/hooks/use-viewed-stories';
import { cn } from '@/core/lib/utils/cn';

interface EventStoriesResponse {
  eventId: string;
  eventTitle: string;
  eventCoverImageUrl: string | null;
  stories: Story[];
}

export function EventStoriesSection({ eventId }: { eventId: string }) {
  const { data } = useQuery<EventStoriesResponse | null>({
    queryKey: ['event-stories', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/catalog/events/${eventId}/stories`);
      if (!res.ok) return null;
      return (await res.json()) as EventStoriesResponse;
    },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });

  const { allViewed } = useViewedStories();
  const [open, setOpen] = React.useState(false);

  const stories = data?.stories ?? [];
  if (stories.length === 0) return null;

  const firstStory = stories[0];
  const everythingViewed = allViewed(stories.map((s) => s.id));
  const ringClass = everythingViewed
    ? 'bg-white/15'
    : 'bg-gradient-to-tr from-fuchsia-500 via-purple-500 to-pink-500';

  const groups: VenueStoriesGroup[] = [
    {
      venueId: data?.eventId ?? eventId,
      venueSlug: eventId,
      venueName: data?.eventTitle ?? 'Evento',
      venueCoverImageUrl: data?.eventCoverImageUrl ?? null,
      stories,
    },
  ];

  return (
    <section className="np-rise mt-6">
      <h2 className="mb-3 font-display text-lg font-bold tracking-tight">
        Historias del evento
      </h2>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex flex-col items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-full"
        aria-label="Ver historias del evento"
      >
        <span
          className={cn(
            'relative grid size-20 place-items-center rounded-full p-[2.5px] transition-transform duration-200 group-hover:scale-[1.04] group-active:scale-95',
            ringClass,
          )}
        >
          <span className="relative size-[72px] overflow-hidden rounded-full border border-black/80 bg-black">
            {firstStory.mediaType === 'IMAGE' ? (
              <Image
                src={firstStory.mediaUrl}
                alt="Historia"
                fill
                sizes="80px"
                loading="lazy"
                className="object-cover"
              />
            ) : (
              <video
                src={`${firstStory.mediaUrl}#t=0.1`}
                muted
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
            )}
            {stories.length > 1 ? (
              <span className="absolute right-0 bottom-0 grid size-5 place-items-center rounded-full border-2 border-black bg-primary text-[10px] font-bold text-white">
                {stories.length}
              </span>
            ) : null}
          </span>
        </span>
        <span className="mt-1.5 line-clamp-1 max-w-[100px] text-center text-[11px] text-white/70">
          Ver historias
        </span>
      </button>

      {open ? (
        <StoriesViewer
          groups={groups}
          initialVenueIndex={0}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </section>
  );
}
