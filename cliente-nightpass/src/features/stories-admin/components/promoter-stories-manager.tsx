'use client';

import * as React from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Camera, Loader2, Trash2 } from 'lucide-react';
import { clientFetch } from '@/core/lib/api/client-client';
import type { PaginatedEvents, Story } from '@/core/types/api';
import { Button } from '@/core/components/ui/button';
import { useDeleteStory } from '../hooks/use-delete-story';
import { OwnerStoryComposer } from './owner-story-composer';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function PromoterStoriesManager() {
  const { data, isLoading } = useQuery({
    queryKey: ['events', 'promoter-me', 'for-stories'],
    queryFn: () => clientFetch<PaginatedEvents>('/api/events?limit=100'),
  });

  const [composerEvent, setComposerEvent] = React.useState<{
    id: string;
    title: string;
  } | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const events = data?.items ?? [];
  if (events.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
        <Calendar className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Aún no tienes eventos. Crea uno para empezar a publicar historias.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <EventStoriesCard
          key={event.id}
          eventId={event.id}
          eventTitle={event.title}
          startsAt={event.startsAt}
          coverImageUrl={event.coverImageUrl}
          onCompose={() => setComposerEvent({ id: event.id, title: event.title })}
        />
      ))}

      {composerEvent && (
        <OwnerStoryComposer
          key={composerEvent.id}
          eventId={composerEvent.id}
          venueName={composerEvent.title}
          autoStart="record"
          onClose={() => setComposerEvent(null)}
        />
      )}
    </div>
  );
}

interface EventStoriesCardProps {
  eventId: string;
  eventTitle: string;
  startsAt: string;
  coverImageUrl: string | null;
  onCompose: () => void;
}

function EventStoriesCard({
  eventId,
  eventTitle,
  startsAt,
  coverImageUrl,
  onCompose,
}: EventStoriesCardProps) {
  const { data: stories } = useQuery({
    queryKey: ['stories-mine-event', eventId],
    queryFn: () => clientFetch<Story[]>(`/api/stories/mine-by-event/${eventId}`),
    staleTime: 30_000,
  });

  const del = useDeleteStory();

  const list = stories ?? [];

  return (
    <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025]">
      <div className="flex items-center gap-4 border-b border-white/8 p-4">
        <div
          className={
            list.length > 0
              ? 'relative size-14 shrink-0 rounded-full bg-gradient-to-tr from-fuchsia-500 via-purple-500 to-amber-400 p-[2px]'
              : 'relative size-14 shrink-0 rounded-full bg-white/8 p-[2px]'
          }
        >
          <div className="relative size-full overflow-hidden rounded-full border-2 border-[#0a0712] bg-white/[0.05]">
            {coverImageUrl ? (
              <Image
                src={coverImageUrl}
                alt={eventTitle}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <Calendar className="m-auto size-5 text-white/40" />
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold tracking-tight">
            {eventTitle}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {formatDate(startsAt)} · {list.length} historia{list.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button
          onClick={onCompose}
          className="shrink-0 gap-1.5 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-4 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)]"
        >
          <Camera className="size-3.5" />
          Subir
        </Button>
      </div>

      {list.length > 0 && (
        <div className="grid grid-cols-3 gap-1 p-1 sm:grid-cols-4 md:grid-cols-6">
          {list.map((story) => (
            <div
              key={story.id}
              className="group relative aspect-[9/16] overflow-hidden rounded-[10px] bg-black"
            >
              {story.mediaType === 'IMAGE' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={story.mediaUrl}
                  alt="Historia"
                  className="size-full object-cover"
                />
              ) : (
                <video
                  src={`${story.mediaUrl}#t=0.1`}
                  muted
                  playsInline
                  preload="metadata"
                  className="size-full object-cover"
                  onLoadedMetadata={(e) => {
                    try {
                      e.currentTarget.currentTime = 0.1;
                    } catch {
                      // ignore — some browsers reject seek before ready
                    }
                  }}
                />
              )}
              <button
                type="button"
                onClick={() => del.mutate(story.id)}
                disabled={del.isPending}
                aria-label="Eliminar"
                className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

