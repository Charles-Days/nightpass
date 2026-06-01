'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { Story } from '@/core/types/api';
import { useMyStories } from '../hooks/use-my-stories';
import type { CreateStoryTarget } from '../hooks/use-create-story';
import { StoriesGrid } from './stories-grid';
import { StoryUploader } from './story-uploader';

interface StoriesManagerProps {
  target: CreateStoryTarget;
  title: string;
  initialStories?: Story[];
  autoStart?: 'record' | 'photo' | null;
  returnTo?: 'app' | 'profile' | null;
}

export function StoriesManager({
  target,
  title,
  initialStories = [],
  autoStart = null,
  returnTo = null,
}: StoriesManagerProps) {
  const venueStories = useMyStories(target.venueId ?? '', initialStories);
  const eventStories = useQuery<Story[]>({
    queryKey: ['stories-mine-event', target.eventId],
    queryFn: () => clientFetch<Story[]>(`/api/stories/mine-by-event/${target.eventId}`),
    enabled: !!target.eventId,
  });

  const stories = (target.venueId ? venueStories.data : eventStories.data) ?? [];

  return (
    <div className="space-y-6">
      <StoryUploader target={target} title={title} autoStart={autoStart} returnTo={returnTo} />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight">
              Historias activas
            </h3>
            <p className="text-xs text-muted-foreground">
              {stories.length === 0
                ? 'Sin historias activas en este momento.'
                : `${stories.length} historia${stories.length === 1 ? '' : 's'} viva${stories.length === 1 ? '' : 's'}.`}
            </p>
          </div>
        </div>
        <StoriesGrid stories={stories} target={target} />
      </section>
    </div>
  );
}
