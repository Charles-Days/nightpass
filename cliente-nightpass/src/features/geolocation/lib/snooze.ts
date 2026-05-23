const KEY = 'np_loc_snooze_until';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getSnooze(): Date | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

export function setSnooze(hours: number): void {
  if (!isBrowser()) return;
  try {
    const until = new Date(Date.now() + hours * 60 * 60 * 1000);
    window.localStorage.setItem(KEY, until.toISOString());
  } catch {
    // ignore
  }
}

export function clearSnooze(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function isSnoozed(): boolean {
  const until = getSnooze();
  if (!until) return false;
  return until.getTime() > Date.now();
}
