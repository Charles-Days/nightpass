'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
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
    staleTime: 300_000,
    refetchInterval: 600_000,
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
              <Image
                src={story.mediaUrl}
                alt="Historia"
                fill
                sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                loading="lazy"
                className="object-cover"
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
