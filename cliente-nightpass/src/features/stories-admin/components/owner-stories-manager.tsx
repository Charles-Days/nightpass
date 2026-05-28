'use client';

import type { Story } from '@/core/types/api';
import { useMyStories } from '../hooks/use-my-stories';
import { StoriesGrid } from './stories-grid';
import { OwnerStoryComposer } from './owner-story-composer';

interface OwnerStoriesManagerProps {
  venueId: string;
  venueName: string;
  initialStories: Story[];
  autoStart?: 'record' | 'photo' | null;
  returnTo?: 'app' | 'profile' | null;
}

export function OwnerStoriesManager({
  venueId,
  venueName,
  initialStories,
  autoStart = null,
  returnTo = null,
}: OwnerStoriesManagerProps) {
  const { data } = useMyStories(venueId, initialStories);
  const stories = data ?? [];

  return (
    <div className="space-y-6">
      <OwnerStoryComposer
        venueId={venueId}
        venueName={venueName}
        autoStart={autoStart}
        returnTo={returnTo}
      />

      <section className="space-y-3">
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
        <StoriesGrid stories={stories} venueId={venueId} />
      </section>
    </div>
  );
}
