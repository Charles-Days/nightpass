'use client';

import { useEffect, useRef } from 'react';
import { pingLocation } from '../lib/ping-location';

const LAST_PING_KEY = 'np_last_app_open_ping';
const THROTTLE_MS = 5 * 60 * 1000; // 5 min

/**
 * Mounts once on app home / customer-app routes. If the user has already
 * granted geolocation permission, silently fetches the current position
 * and pings the backend with source=APP_OPEN. Throttled to once per 5min.
 */
export function AppOpenPinger() {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;

    // Throttle check.
    try {
      const last = window.localStorage.getItem(LAST_PING_KEY);
      if (last) {
        const t = Number(last);
        if (Number.isFinite(t) && Date.now() - t < THROTTLE_MS) return;
      }
    } catch {
      // ignore
    }

    let cancelled = false;

    const fire = async () => {
      // Confirm the permission is already granted — avoid triggering the
      // browser prompt from background.
      try {
        const permissions = navigator.permissions;
        if (permissions && typeof permissions.query === 'function') {
          const res = await permissions.query({ name: 'geolocation' as PermissionName });
          if (res.state !== 'granted') return;
        }
      } catch {
        return;
      }

      if (cancelled) return;

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          const ok = await pingLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyM: pos.coords.accuracy,
            source: 'APP_OPEN',
          });
          if (ok) {
            try {
              window.localStorage.setItem(LAST_PING_KEY, String(Date.now()));
            } catch {
              // ignore
            }
          }
        },
        () => {
          // Silent failure.
        },
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 },
      );
    };

    void fire();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
