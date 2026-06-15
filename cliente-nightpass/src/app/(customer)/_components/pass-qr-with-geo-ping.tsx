'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { Loader2, MapPin, MapPinOff } from 'lucide-react';
import { pingLocation } from '@/features/geolocation';
import { PassQR } from './pass-qr';

type GeoState =
  | 'idle'
  | 'requesting'
  | 'verified'
  | 'denied'
  | 'error'
  | 'unsupported';

interface Props {
  value: string;
  usedAt: string | null;
}

export function PassQRWithGeoPing({ value, usedAt }: Props) {
  const [state, setState] = useState<GeoState>('idle');

  const requestGeo = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setState('unsupported');
      return;
    }
    setState('requesting');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await pingLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          source: 'PASS_VIEW',
        });
        setState('verified');
      },
      (err) => {
        setState(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 6_000 },
    );
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {!usedAt &&
        (state === 'idle' ? (
          <GeoPrime onConfirm={requestGeo} />
        ) : (
          <GeoChip key={state} state={state} />
        ))}
      <PassQR value={value} usedAt={usedAt} />
    </div>
  );
}

function GeoPrime({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="w-full max-w-[280px] rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-center np-fade-in">
      <p className="text-[12px] leading-relaxed text-white/65">
        En la puerta confirmamos que estás en el local. Tocá para verificar tu
        ubicación — no guardamos tu historial.
      </p>
      <button
        type="button"
        onClick={onConfirm}
        className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-4 py-2 text-[12px] font-semibold text-white transition active:scale-95 transform-gpu"
      >
        <MapPin className="size-3.5" />
        Verificar mi ubicación
      </button>
    </div>
  );
}

function GeoChip({ state }: { state: GeoState }) {
  if (state === 'requesting') {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/[0.07] px-3 py-1 text-[11px] font-medium text-white/65 np-fade-in">
        <Loader2 className="size-3 animate-spin text-primary transform-gpu" />
        <span className="size-1.5 rounded-full bg-primary np-dot-pulse-fast transform-gpu" />
        Verificando ubicación…
      </div>
    );
  }
  if (state === 'verified') {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300 np-pop-in transform-gpu">
        <MapPin className="size-3" />
        Ubicación verificada
      </div>
    );
  }
  if (state === 'denied') {
    return (
      <Link
        href="/app/perfil#ubicacion"
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-400/15 active:scale-95 transform-gpu np-fade-in"
      >
        <MapPinOff className="size-3" />
        Activa la ubicación para validar en puerta
      </Link>
    );
  }
  if (state === 'error') {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/[0.07] px-3 py-1 text-[11px] font-medium text-white/60 np-fade-in">
        <MapPinOff className="size-3" />
        No pudimos verificar tu ubicación
      </div>
    );
  }
  if (state === 'unsupported') {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/[0.07] px-3 py-1 text-[11px] font-medium text-white/55 np-fade-in">
        <MapPinOff className="size-3" />
        Sin soporte de ubicación
      </div>
    );
  }
  return null;
}
