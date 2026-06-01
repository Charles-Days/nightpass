'use client';

import * as React from 'react';
import type { Story } from '@/core/types/api';
import { StoryCard } from './story-card';
import type { CreateStoryTarget } from '../hooks/use-create-story';

interface StoriesGridProps {
  stories: Story[];
  target: CreateStoryTarget;
}

export function StoriesGrid({ stories, target }: StoriesGridProps) {
  if (stories.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.015] p-10 text-center">
        <p className="text-sm text-white/70">
          Aún no has publicado historias. Sube una para empezar.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Cada historia vive 24 horas en el muro de tu local.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {stories.map((story) => (
        <StoryCard key={story.id} story={story} target={target} />
      ))}
    </div>
  );
}
