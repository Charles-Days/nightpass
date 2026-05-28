'use client';

import { useQuery } from '@tanstack/react-query';
import type { Story } from '@/core/types/api';

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
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const stories = data?.stories ?? [];
  if (stories.length === 0) return null;

  return (
    <section className="np-rise mt-6">
      <h2 className="mb-3 font-display text-lg font-bold tracking-tight">
        Historias del evento
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {stories.map((story) => (
          <div
            key={story.id}
            className="relative aspect-[9/16] overflow-hidden rounded-[12px] border border-white/10 bg-black"
          >
            {story.mediaType === 'IMAGE' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={story.mediaUrl}
                alt="Historia"
                className="size-full object-cover"
                loading="lazy"
              />
            ) : (
              <video
                src={story.mediaUrl}
                muted
                loop
                playsInline
                preload="metadata"
                className="size-full object-cover"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
