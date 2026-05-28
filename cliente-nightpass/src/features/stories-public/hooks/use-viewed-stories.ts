'use client';

import { useCallback, useEffect, useState } from 'react';
import { getViewedSet, markViewed as markViewedStorage } from '../lib/viewed-storage';

export function useViewedStories() {
  const [viewed, setViewed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setViewed(getViewedSet());
  }, []);

  const markViewed = useCallback((id: string) => {
    markViewedStorage(id);
    setViewed((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const isViewed = useCallback((id: string) => viewed.has(id), [viewed]);

  const allViewed = useCallback(
    (ids: string[]) => ids.length > 0 && ids.every((id) => viewed.has(id)),
    [viewed],
  );

  return { viewed, isViewed, allViewed, markViewed };
}
