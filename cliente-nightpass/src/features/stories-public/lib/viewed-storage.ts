const KEY = 'np_viewed_stories_v1';

export function getViewedSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export function markViewed(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const set = getViewedSet();
    if (set.has(id)) return;
    set.add(id);
    const arr = Array.from(set).slice(-500);
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {
    // ignore quota errors
  }
}

export function isViewed(id: string) {
  return getViewedSet().has(id);
}
