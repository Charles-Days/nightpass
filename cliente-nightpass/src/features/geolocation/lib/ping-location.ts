export type LocationSource = 'APP_OPEN' | 'PASS_VIEW' | 'CHECKOUT' | 'MANUAL';

export interface PingLocationInput {
  latitude: number;
  longitude: number;
  accuracyM?: number | null;
  source: LocationSource;
}

/**
 * Background ping to record the user's location. Fire-and-forget,
 * silent on errors (no toasts).
 */
export async function pingLocation(input: PingLocationInput): Promise<boolean> {
  try {
    const res = await fetch('/api/me/location', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: input.latitude,
        longitude: input.longitude,
        accuracyM: input.accuracyM ?? null,
        source: input.source,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
