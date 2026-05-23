'use client';

import { useCallback, useEffect, useState } from 'react';

export type GeolocationStatus =
  | 'idle'
  | 'prompt'
  | 'granted'
  | 'denied'
  | 'unsupported';

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 60_000,
  timeout: 8_000,
};

export interface GeolocationApi {
  status: GeolocationStatus;
  position: GeolocationPosition | null;
  error: GeolocationPositionError | null;
  request: (opts?: PositionOptions) => Promise<GeolocationPosition | null>;
}

export function useGeolocation(): GeolocationApi {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }

    let cancelled = false;
    const permissions = (navigator as Navigator).permissions;
    if (!permissions || typeof permissions.query !== 'function') {
      setStatus('prompt');
      return;
    }

    permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((result) => {
        if (cancelled) return;
        setStatus(result.state as GeolocationStatus);
        const onChange = () => {
          setStatus(result.state as GeolocationStatus);
        };
        try {
          result.addEventListener('change', onChange);
        } catch {
          // older browsers
          (result as PermissionStatus).onchange = onChange;
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('prompt');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const request = useCallback(
    (opts?: PositionOptions) =>
      new Promise<GeolocationPosition | null>((resolve) => {
        if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
          setStatus('unsupported');
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setPosition(pos);
            setError(null);
            setStatus('granted');
            resolve(pos);
          },
          (err) => {
            setError(err);
            if (err.code === err.PERMISSION_DENIED) {
              setStatus('denied');
            }
            resolve(null);
          },
          { ...DEFAULT_OPTIONS, ...(opts ?? {}) },
        );
      }),
    [],
  );

  return { status, position, error, request };
}
