'use client';

import * as React from 'react';
import type { Story } from '@/core/types/api';
import { useMyStories } from '../hooks/use-my-stories';
import { StoriesGrid } from './stories-grid';
import { StoryUploader } from './story-uploader';

interface StoriesManagerProps {
  venueId: string;
  venueName: string;
  initialStories: Story[];
}

export function StoriesManager({ venueId, venueName, initialStories }: StoriesManagerProps) {
  const { data } = useMyStories(venueId, initialStories);
  const stories = data ?? [];

  return (
    <div className="space-y-6">
      <StoryUploader venueId={venueId} venueName={venueName} />

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
        <StoriesGrid stories={stories} venueId={venueId} />
      </section>
    </div>
  );
}
