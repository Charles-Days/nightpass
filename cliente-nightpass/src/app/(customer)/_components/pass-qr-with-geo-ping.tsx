'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Loader2, MapPin, MapPinOff } from 'lucide-react';
import { pingLocation } from '@/features/geolocation';
import { PassQR } from './pass-qr';

type GeoState = 'idle' | 'requesting' | 'verified' | 'denied' | 'error' | 'unsupported';

interface Props {
  value: string;
  usedAt: string | null;
}

export function PassQRWithGeoPing({ value, usedAt }: Props) {
  const [state, setState] = useState<GeoState>('idle');

  useEffect(() => {
    if (usedAt) return; // already used, skip ping
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setState('unsupported');
      return;
    }

    let cancelled = false;
    setState('requesting');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (cancelled) return;
        await pingLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          source: 'PASS_VIEW',
        });
        if (!cancelled) setState('verified');
      },
      (err) => {
        if (cancelled) return;
        if (err.code === err.PERMISSION_DENIED) {
          setState('denied');
        } else {
          setState('error');
        }
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 6_000 },
    );

    return () => {
      cancelled = true;
    };
  }, [usedAt]);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {!usedAt && state !== 'idle' && (
        <GeoChip state={state} />
      )}
      <PassQR value={value} usedAt={usedAt} />
    </div>
  );
}

function GeoChip({ state }: { state: GeoState }) {
  if (state === 'requesting') {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-white/65">
        <Loader2 className="size-3 animate-spin text-primary" />
        Verificando ubicación…
      </div>
    );
  }
  if (state === 'verified') {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
        <MapPin className="size-3" />
        Ubicación verificada
      </div>
    );
  }
  if (state === 'denied') {
    return (
      <Link
        href="/app/perfil#ubicacion"
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-400/15"
      >
        <MapPinOff className="size-3" />
        Activa la ubicación para validar en puerta
      </Link>
    );
  }
  if (state === 'error') {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-white/60">
        <MapPinOff className="size-3" />
        No pudimos verificar tu ubicación
      </div>
    );
  }
  if (state === 'unsupported') {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-white/55">
        <MapPinOff className="size-3" />
        Sin soporte de ubicación
      </div>
    );
  }
  return null;
}
