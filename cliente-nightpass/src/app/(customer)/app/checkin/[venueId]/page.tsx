'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, MapPin } from 'lucide-react';
import { paths } from '@/core/config/paths';
import { ClientApiError } from '@/core/lib/api/client-client';
import { TIER_STYLES, TierBadge, useVenueCheckin } from '@/features/loyalty';
import type { VenueCheckinResponse } from '@/core/types/api';

type Phase =
  | { kind: 'idle' }
  | { kind: 'requesting-geo' }
  | { kind: 'geo-denied' }
  | { kind: 'submitting' }
  | { kind: 'success'; data: VenueCheckinResponse }
  | { kind: 'error'; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HMAC_RE = /^[0-9a-f]+$/i;

export default function CheckinFromUrlPage() {
  const router = useRouter();
  const params = useParams<{ venueId: string }>();
  const search = useSearchParams();
  const venueId = params.venueId;
  const token = search.get('t');
  const checkin = useVenueCheckin();
  const firedRef = React.useRef(false);
  const [phase, setPhase] = React.useState<Phase>({ kind: 'idle' });

  const validFormat =
    typeof venueId === 'string' &&
    UUID_RE.test(venueId) &&
    typeof token === 'string' &&
    HMAC_RE.test(token);

  React.useEffect(() => {
    if (firedRef.current) return;
    if (!validFormat) return;
    firedRef.current = true;

    const run = async () => {
      setPhase({ kind: 'requesting-geo' });

      let coords: { latitude: number; longitude: number };
      try {
        coords = await new Promise((resolve, reject) => {
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
        });
      } catch {
        setPhase({ kind: 'geo-denied' });
        return;
      }

      setPhase({ kind: 'submitting' });
      try {
        const result = await checkin.mutateAsync({
          venueId: venueId!,
          qrPayload: `np_checkin_${venueId}_${token}`,
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setPhase({ kind: 'success', data: result });
        setTimeout(() => router.push(paths.recompensas as never), 2800);
      } catch (err) {
        const message =
          err instanceof ClientApiError
            ? err.message
            : 'No pudimos procesar el check-in. Inténtalo de nuevo.';
        setPhase({ kind: 'error', message });
      }
    };

    void run();
  }, [validFormat, venueId, token, checkin, router]);

  if (!validFormat) {
    return (
      <Wrapper>
        <BadFormat />
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      {phase.kind === 'idle' || phase.kind === 'requesting-geo' ? (
        <Status
          icon={<MapPin className="size-7 animate-pulse text-primary" />}
          title="Validando que estás en el bar…"
          message="Activa la ubicación si tu navegador te lo pide. Solo confirma que estás dentro del local; no se guarda histórico."
        />
      ) : phase.kind === 'submitting' ? (
        <Status
          icon={<Loader2 className="size-7 animate-spin text-primary" />}
          title="Procesando check-in…"
          message="Te estamos sumando los puntos NightPass."
        />
      ) : phase.kind === 'geo-denied' ? (
        <GeoDenied onRetry={() => window.location.reload()} />
      ) : phase.kind === 'error' ? (
        <ErrorView message={phase.message} onRetry={() => window.location.reload()} />
      ) : (
        <Success data={phase.data} />
      )}
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[80dvh] w-full max-w-md flex-col items-center justify-center px-5 py-8 sm:px-8">
      {children}
    </div>
  );
}

function Status({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="np-pop-in w-full rounded-[26px] border border-white/14 bg-white/[0.05] p-7 text-center">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-primary/12">
        {icon}
      </div>
      <h1 className="font-display text-2xl font-bold tracking-[-0.015em]">{title}</h1>
      <p className="mt-2 text-sm text-white/65">{message}</p>
    </div>
  );
}

function GeoDenied({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="np-pop-in w-full rounded-[26px] border border-amber-400/20 bg-amber-500/[0.06] p-7 text-center">
      <AlertTriangle className="mx-auto mb-3 size-9 text-amber-300" />
      <h1 className="font-display text-2xl font-bold">Necesitamos tu ubicación</h1>
      <p className="mt-2 text-sm text-white/70">
        Para validar que estás dentro del bar pedimos GPS. Activa el permiso en tu
        navegador y vuelve a intentar.
      </p>
      <button
        onClick={onRetry}
        className="np-glow-pulse mt-5 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(168,85,247,0.55)] transform-gpu transition active:scale-95"
      >
        Reintentar
      </button>
    </div>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="np-pop-in w-full rounded-[26px] border border-rose-400/25 bg-rose-500/[0.07] p-7 text-center">
      <AlertTriangle className="mx-auto mb-3 size-9 text-rose-300" />
      <h1 className="font-display text-xl font-bold">No pudimos procesar el check-in</h1>
      <p className="mt-2 text-sm text-white/75">{message}</p>
      <button
        onClick={onRetry}
        className="mt-5 rounded-full bg-white/8 px-5 py-2.5 text-sm font-semibold text-white transform-gpu transition active:scale-95 hover:bg-white/12"
      >
        Reintentar
      </button>
      <Link
        href={paths.recompensas as never}
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/55 transition hover:text-white active:scale-95 transform-gpu"
      >
        <ArrowLeft className="size-3.5" /> Volver a Recompensas
      </Link>
    </div>
  );
}

function BadFormat() {
  return (
    <div className="np-pop-in w-full rounded-[26px] border border-rose-400/25 bg-rose-500/[0.07] p-7 text-center">
      <AlertTriangle className="mx-auto mb-3 size-9 text-rose-300" />
      <h1 className="font-display text-xl font-bold">Link inválido</h1>
      <p className="mt-2 text-sm text-white/75">
        Este QR no parece ser un check-in de NightPass válido. Pídele al bar que rote
        el código.
      </p>
      <Link
        href={paths.recompensas as never}
        className="mt-5 inline-flex items-center gap-1.5 text-sm text-primary transition hover:text-primary/80 active:scale-95 transform-gpu"
      >
        <ArrowLeft className="size-3.5" /> Volver a Recompensas
      </Link>
    </div>
  );
}

function Success({ data }: { data: VenueCheckinResponse }) {
  const tierStyle = TIER_STYLES[data.tier];
  const already = data.awarded === 0 && data.alreadyCheckedInToday;

  return (
    <div className="np-pop-in relative w-full overflow-hidden rounded-[26px] border border-white/12 bg-white/[0.05] p-7 text-center">
      <div
        className={`absolute inset-x-8 -top-20 h-44 rounded-full bg-gradient-to-br ${tierStyle.gradient} opacity-30 blur-3xl`}
      />
      {!already ? (
        <div
          aria-hidden
          className="np-confetti-burst pointer-events-none absolute left-1/2 top-10 -translate-x-1/2"
        >
          <div className="size-20 rounded-full bg-gradient-to-br from-[#a855f7]/45 via-[#ec4899]/30 to-transparent blur-2xl" />
        </div>
      ) : null}
      <div className="relative">
        {already ? (
          <>
            <AlertTriangle className="mx-auto mb-3 size-10 text-amber-300" />
            <h1 className="font-display text-2xl font-bold">Ya hiciste check-in hoy</h1>
            <p className="mt-2 text-sm text-white/70">
              Vuelve mañana — solo 1 check-in por bar al día.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="mx-auto mb-3 size-12 text-emerald-300" />
            <h1 className="font-display text-3xl font-bold tracking-[-0.02em]">
              +{data.awarded} NPP
            </h1>
            <p className="mt-1 text-sm text-white/65">Listo. Estás en la lista.</p>
          </>
        )}
        <div className="mt-5 flex flex-col items-center gap-2">
          <TierBadge tier={data.tier} />
          <p className="text-xs text-white/55">
            Racha: <span className="font-semibold text-white">{data.newStreakDays} días</span>
          </p>
        </div>
        <p className="mt-6 text-xs text-white/40">
          Redirigiendo a Recompensas…
        </p>
      </div>
    </div>
  );
}
