'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from '@zxing/browser';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { paths } from '@/core/config/paths';
import { ClientApiError } from '@/core/lib/api/client-client';
import {
  TIER_STYLES,
  TierBadge,
  useVenueCheckin,
} from '@/features/loyalty';
import type { VenueCheckinResponse } from '@/core/types/api';

const COOLDOWN_MS = 2500;
const QR_RE = /^np_checkin_([0-9a-f-]{36})_([0-9a-f]+)$/i;
/** URL variant emitted by `rotateVenueCheckinSecret.scanUrl`. */
const URL_RE = /\/app\/checkin\/([0-9a-f-]{36})\?(?:.*&)?t=([0-9a-f]+)/i;

type Phase =
  | { kind: 'idle' }
  | { kind: 'requesting-camera' }
  | { kind: 'scanning' }
  | { kind: 'requesting-geo' }
  | { kind: 'submitting' }
  | { kind: 'geo-denied' }
  | { kind: 'success'; data: VenueCheckinResponse };

/** Accept either raw (`np_checkin_<uuid>_<hmac>`) or URL form. Returns the
 *  normalized raw payload (what the backend expects) plus the venueId. */
function parseCheckinQr(input: string): { venueId: string; payload: string } | null {
  const s = input.trim();
  const raw = QR_RE.exec(s);
  if (raw) return { venueId: raw[1], payload: s };
  const url = URL_RE.exec(s);
  if (url) return { venueId: url[1], payload: `np_checkin_${url[1]}_${url[2]}` };
  return null;
}

export default function ScanCheckinPage() {
  const router = useRouter();
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const controlsRef = React.useRef<IScannerControls | null>(null);
  const lastScanRef = React.useRef<{ qr: string; at: number } | null>(null);
  const [phase, setPhase] = React.useState<Phase>({ kind: 'idle' });
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const checkin = useVenueCheckin();

  const stop = React.useCallback(() => {
    try {
      controlsRef.current?.stop();
    } catch {
      /* ignore */
    }
    controlsRef.current = null;
  }, []);

  const handleScan = React.useCallback(
    async (qr: string) => {
      const parsed = parseCheckinQr(qr);
      if (!parsed) {
        toast.error('QR no reconocido — busca el QR oficial del bar.');
        return;
      }
      const { venueId, payload: qrPayload } = parsed;

      setPhase({ kind: 'requesting-geo' });

      let coords: { latitude: number; longitude: number };
      try {
        coords = await new Promise<{ latitude: number; longitude: number }>(
          (resolve, reject) => {
            if (!('geolocation' in navigator)) {
              reject(new Error('GEO_UNSUPPORTED'));
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (pos) =>
                resolve({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                }),
              (err) => reject(err),
              { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
            );
          },
        );
      } catch {
        setPhase({ kind: 'geo-denied' });
        return;
      }

      setPhase({ kind: 'submitting' });
      try {
        const result = await checkin.mutateAsync({
          venueId,
          qrPayload,
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        stop();
        setPhase({ kind: 'success', data: result });
        if (!result.alreadyCheckedInToday && result.awarded > 0) {
          window.setTimeout(() => {
            router.push(paths.recompensas);
          }, 2500);
        }
      } catch (err) {
        const message =
          err instanceof ClientApiError && err.payload
            ? extractMessage(err.payload) ?? 'No pudimos validar tu check-in'
            : 'No pudimos validar tu check-in';
        toast.error(message);
        setPhase({ kind: 'scanning' });
      }
    },
    [checkin, router, stop],
  );

  const start = React.useCallback(async () => {
    setCameraError(null);
    setPhase({ kind: 'requesting-camera' });
    try {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result) => {
          if (!result) return;
          const text = result.getText();
          const last = lastScanRef.current;
          if (last && last.qr === text && Date.now() - last.at < COOLDOWN_MS) {
            return;
          }
          lastScanRef.current = { qr: text, at: Date.now() };
          handleScan(text);
        },
      );
      controlsRef.current = controls;
      setPhase({ kind: 'scanning' });
    } catch (err) {
      const msg = (err as Error).message ?? 'No se pudo acceder a la cámara';
      setCameraError(msg);
      setPhase({ kind: 'idle' });
    }
  }, [handleScan]);

  React.useEffect(() => {
    return () => stop();
  }, [stop]);

  // ── Success screen ──────────────────────────────────────────────────────
  if (phase.kind === 'success') {
    const data = phase.data;
    if (data.alreadyCheckedInToday) {
      return (
        <SuccessFrame
          icon={<AlertTriangle className="size-12 text-amber-300" />}
          title="Ya hiciste check-in hoy"
          subtitle="Vuelve mañana para sumar más puntos."
          tier={data.tier}
          streakDays={data.newStreakDays}
          awarded={0}
        />
      );
    }
    return (
      <SuccessFrame
        icon={<CheckCircle2 className="size-12 text-emerald-300" />}
        title="¡Check-in registrado!"
        subtitle="Sigue así para mantener tu racha."
        tier={data.tier}
        streakDays={data.newStreakDays}
        awarded={data.awarded}
      />
    );
  }

  return (
    <div className="relative mx-auto flex min-h-[calc(100dvh-160px)] w-full max-w-2xl flex-col px-5 py-6 sm:px-8 sm:py-10">
      <Link
        href={paths.recompensas}
        className="np-rise inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground active:scale-95 transform-gpu"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>

      <section className="mt-6">
        <p className="np-rise text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary" style={{ animationDelay: '60ms' }}>
          Check-in
        </p>
        <h1 className="np-rise mt-3 font-display text-3xl font-bold leading-[1.05] tracking-[-0.025em] sm:text-4xl" style={{ animationDelay: '120ms' }}>
          Escanea el QR del bar
        </h1>
        <p className="np-rise mt-2 max-w-md text-sm text-muted-foreground" style={{ animationDelay: '180ms' }}>
          Suma puntos NightPass por estar aquí. Necesitamos tu ubicación para
          validar que sí estás en el local.
        </p>
      </section>

      {/* Cámara */}
      <section className="np-rise mt-6 overflow-hidden rounded-[22px] border border-white/10 bg-black/60" style={{ animationDelay: '240ms' }}>
        <div className="relative aspect-square">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
          />

          {phase.kind === 'idle' ? (
            <div className="np-fade-in absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 p-6 text-center">
              <Camera className="size-10 text-primary" />
              <p className="max-w-xs text-sm text-muted-foreground">
                Activa la cámara para empezar a escanear el QR del bar.
              </p>
              {cameraError ? (
                <p className="text-xs text-amber-400">{cameraError}</p>
              ) : null}
              <button
                onClick={start}
                className="np-glow-pulse rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-5 py-2 text-sm font-semibold text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)] transform-gpu transition active:scale-95 hover:brightness-110"
              >
                Iniciar cámara
              </button>
            </div>
          ) : null}

          {phase.kind === 'requesting-camera' ? (
            <div className="np-fade-in absolute inset-0 grid place-items-center bg-black/70 text-sm text-white">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Abriendo cámara…
              </span>
            </div>
          ) : null}

          {phase.kind === 'requesting-geo' ? (
            <div className="np-fade-in absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center text-sm text-white">
              <MapPin className="size-8 animate-pulse text-primary" />
              <p>Confirma tu ubicación para validar el check-in…</p>
            </div>
          ) : null}

          {phase.kind === 'submitting' ? (
            <div className="np-fade-in absolute inset-0 grid place-items-center bg-black/85 text-sm text-white">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Registrando tu
                check-in…
              </span>
            </div>
          ) : null}

          {phase.kind === 'geo-denied' ? (
            <div className="np-fade-in absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 px-6 text-center text-sm text-white">
              <AlertTriangle className="size-8 text-amber-300" />
              <p className="font-semibold">Necesitamos tu ubicación</p>
              <p className="max-w-xs text-xs text-white/70">
                Sin permiso de ubicación no podemos validar que estás en el
                bar. Actívalo en los ajustes del navegador y vuelve a
                intentar.
              </p>
              <button
                onClick={() => setPhase({ kind: 'scanning' })}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm transform-gpu transition active:scale-95 hover:bg-white/[0.06]"
              >
                <RefreshCw className="size-4" />
                Reintentar
              </button>
            </div>
          ) : null}

          <div
            aria-hidden
            className={`pointer-events-none absolute inset-12 rounded-2xl border-2 ${
              phase.kind === 'scanning'
                ? 'np-scan-ring border-primary/60'
                : 'border-primary/60 shadow-[0_0_40px_rgba(168,85,247,0.4)]'
            }`}
          />
        </div>
      </section>

      <p className="np-fade-in mt-4 text-center text-[11px] text-white/45" style={{ animationDelay: '320ms' }}>
        Solo el QR oficial pegado en la entrada del bar funciona. Los QRs de
        pases son distintos.
      </p>
    </div>
  );
}

function SuccessFrame({
  icon,
  title,
  subtitle,
  tier,
  streakDays,
  awarded,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tier: VenueCheckinResponse['tier'];
  streakDays: number;
  awarded: number;
}) {
  const tierStyle = TIER_STYLES[tier];
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-160px)] w-full max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
      <div className="np-pop-in relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.025] px-8 py-10 sm:px-12 sm:py-14">
        {awarded > 0 ? (
          <div
            aria-hidden
            className="np-confetti-burst pointer-events-none absolute left-1/2 top-12 -translate-x-1/2"
          >
            <div className="size-24 rounded-full bg-gradient-to-br from-[#a855f7]/45 via-[#ec4899]/30 to-transparent blur-2xl" />
          </div>
        ) : null}
        <div className="relative">
          <div className="grid place-items-center">{icon}</div>
          <h1 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-white/65">{subtitle}</p>

          {awarded > 0 ? (
            <p
              className="mt-7 font-display text-5xl font-bold leading-none tracking-tight"
              style={{
                backgroundImage: 'linear-gradient(135deg, #9333ea, #a855f7, #ec4899)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              +{awarded} NPP
            </p>
          ) : (
            <p className="mt-7 font-display text-3xl font-bold leading-none tracking-tight text-white/60">
              +0 NPP
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <TierBadge tier={tier} />
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/75">
              Racha: {streakDays} {streakDays === 1 ? 'día' : 'días'}
            </span>
          </div>

          <p className="mt-2 text-[11px] text-white/40">{tierStyle.description}</p>

          <Link
            href={paths.recompensas}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(168,85,247,0.55)] transform-gpu transition active:scale-95 hover:brightness-110"
          >
            Ver mi progreso
          </Link>
        </div>
      </div>
    </div>
  );
}

function extractMessage(payload: unknown): string | null {
  if (typeof payload === 'object' && payload !== null) {
    const m = (payload as Record<string, unknown>).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m) && m.length > 0) return String(m[0]);
  }
  return null;
}
