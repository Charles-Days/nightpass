'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  Pause,
  Play,
  Share2,
  Star,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Button } from '@/core/components/ui/button';

const AUDIO_SRC = '/audio/demo.mp3';
const AUDIO_VOLUME = 0.5;
const MUTED_KEY = 'np-demo-muted';

const STEPS = [
  {
    id: 'discover',
    title: 'Descubre en vivo',
    sub: 'Bares cerca con aforo en tiempo real, géneros y precios actualizados al minuto.',
  },
  {
    id: 'venue',
    title: 'Elige tu local',
    sub: 'Toda la info: aforo, género, distancia y precio del cover.',
  },
  {
    id: 'pay',
    title: 'Paga el cover',
    sub: 'Apple Pay, Google Pay o tarjeta. Sin efectivo, sin colas.',
  },
  {
    id: 'qr',
    title: 'Tu pase digital',
    sub: 'QR único y encriptado. No se pierde, no se duplica.',
  },
  {
    id: 'in',
    title: 'Adelante',
    sub: 'Llegas, escaneas, entras. Cero filas, cero fricción.',
  },
] as const;

type StepId = (typeof STEPS)[number]['id'];

const DURATION_MS = 18_000;

type AudioStatus = 'idle' | 'playing' | 'blocked' | 'missing';

export function DemoDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle');
  const audioRef = useRef<HTMLAudioElement>(null);

  // Recuperar preferencia de mute (post-mount, evita mismatch de hydration)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setMuted(window.localStorage.getItem(MUTED_KEY) === '1');
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const next = useCallback(() => setStep((s) => (s + 1) % STEPS.length), []);
  const prev = useCallback(() => setStep((s) => (s - 1 + STEPS.length) % STEPS.length), []);
  const start = useCallback(() => {
    setStep(0);
    setPaused(false);
    setOpen(true);
  }, []);
  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(MUTED_KEY, next ? '1' : '0');
      }
      return next;
    });
  }, []);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, next, prev]);

  // Auto-advance
  useEffect(() => {
    if (!open || paused) return;
    const id = window.setTimeout(next, DURATION_MS);
    return () => window.clearTimeout(id);
  }, [open, step, paused, next]);

  // Audio: arrancar al abrir, parar al cerrar (gesto del usuario => sin bloqueos)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (open) {
      audio.volume = AUDIO_VOLUME;
      audio.currentTime = 0;
      audio
        .play()
        .then(() => setAudioStatus('playing'))
        .catch((err) => {
          if (audio.error) {
            console.warn(
              `[NightPass demo] Audio file not found at ${AUDIO_SRC}. Drop an MP3 there to enable music.`,
              err,
            );
            setAudioStatus('missing');
          } else {
            console.warn('[NightPass demo] Autoplay blocked. Click the audio button to play.', err);
            setAudioStatus('blocked');
          }
        });
      return () => {
        audio.pause();
        audio.currentTime = 0;
      };
    }
    audio.pause();
  }, [open]);

  // Manual unlock para el caso "blocked"
  const tryUnlock = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio
      .play()
      .then(() => setAudioStatus('playing'))
      .catch(() => setAudioStatus('blocked'));
  }, []);

  // Sync mute con el elemento <audio>
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  return (
    <>
      <audio
        ref={audioRef}
        src={AUDIO_SRC}
        loop
        preload="none"
        aria-hidden
        onError={() => setAudioStatus('missing')}
      />

      <Button
        type="button"
        size="lg"
        variant="ghost"
        className="group h-12 rounded-full px-5 text-base font-medium text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
        onClick={start}
      >
        <Play className="size-4 fill-current" />
        Ver demo
        <span className="text-xs text-muted-foreground/70 group-hover:text-foreground/70">· 90 s</span>
      </Button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="demo-title"
              className="fixed inset-0 z-[100] grid place-items-center bg-black/90 p-4 backdrop-blur-2xl backdrop-saturate-50"
              onClick={close}
            >
              <div
                className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/15 bg-[oklch(0.11_0.015_280)] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),0_0_60px_-10px_rgba(168,85,247,0.25)] ring-1 ring-purple-500/20 sm:p-10"
                onClick={(e) => e.stopPropagation()}
              >
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:bg-white/[0.08] hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            <div className="grid items-center gap-8 lg:grid-cols-[300px_1fr] lg:gap-14">
              <div className="flex justify-center">
                <DemoPhone screen={STEPS[step].id} />
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.22em] text-primary uppercase">
                    Demo · paso {step + 1} de {STEPS.length}
                  </p>
                  <h2
                    id="demo-title"
                    className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl"
                  >
                    {STEPS[step].title}
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                    {STEPS[step].sub}
                  </p>
                </div>

                <div className="flex gap-2">
                  {STEPS.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStep(i)}
                      aria-label={`Ir al paso ${i + 1}`}
                      className={`h-1 flex-1 overflow-hidden rounded-full transition ${
                        i === step
                          ? 'bg-white/10'
                          : i < step
                            ? 'bg-primary/40'
                            : 'bg-white/[0.06]'
                      }`}
                    >
                      {i === step ? (
                        <div
                          key={`${step}-${paused ? 'p' : 'r'}`}
                          className="h-full bg-primary"
                          style={{
                            animation: paused
                              ? undefined
                              : `demo-progress ${DURATION_MS}ms linear forwards`,
                          }}
                        />
                      ) : null}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={prev}
                    aria-label="Anterior"
                    className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] transition hover:bg-white/[0.08]"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaused((p) => !p)}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm transition hover:bg-white/[0.08]"
                  >
                    {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
                    {paused ? 'Reanudar' : 'Pausar'}
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    aria-label="Siguiente"
                    className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] transition hover:bg-white/[0.08]"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                  {audioStatus === 'blocked' ? (
                    <button
                      type="button"
                      onClick={tryUnlock}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-4 text-sm text-primary transition hover:bg-primary/20"
                    >
                      <Volume2 className="size-4" />
                      Activar sonido
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={toggleMute}
                      disabled={audioStatus === 'missing'}
                      aria-label={muted ? 'Activar sonido' : 'Silenciar'}
                      aria-pressed={!muted}
                      className={`grid size-10 place-items-center rounded-full border transition ${
                        audioStatus === 'missing'
                          ? 'cursor-not-allowed border-amber-400/30 bg-amber-400/10 text-amber-300/70'
                          : muted
                            ? 'border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]'
                            : 'border-primary/40 bg-primary/15 text-primary hover:bg-primary/20'
                      }`}
                    >
                      {audioStatus === 'missing' || muted ? (
                        <VolumeX className="size-4" />
                      ) : (
                        <Volume2 className="size-4" />
                      )}
                    </button>
                  )}
                  {audioStatus === 'missing' ? (
                    <span className="text-[11px] text-amber-300/80">
                      Sin audio · agregá <code className="font-mono">/audio/demo.mp3</code>
                    </span>
                  ) : null}
                  <span className="ml-auto hidden text-[11px] text-muted-foreground sm:inline">
                    Esc · ← → · Espacio
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>,
            document.body,
          )
        : null}
    </>
  );
}

// ────────────────────────────────────────────────
// Phone con switch de pantallas
// ────────────────────────────────────────────────

function DemoPhone({ screen }: { screen: StepId }) {
  return (
    <div
      style={{
        width: 280,
        height: 580,
        padding: 8,
        borderRadius: 44,
        background: 'linear-gradient(160deg, #2a2a35, #0a0a0f)',
        boxShadow:
          '0 40px 80px -20px rgba(168,85,247,0.4), 0 20px 40px -10px rgba(0,0,0,0.7), inset 0 0 0 1.5px rgba(255,255,255,0.08)',
      }}
    >
      <div
        className="relative size-full overflow-hidden rounded-[36px]"
        style={{ background: 'linear-gradient(180deg, #1a0b2e 0%, #0a0a0f 100%)' }}
      >
        <div className="absolute top-2 left-1/2 z-20 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
        <div className="absolute top-3.5 right-6 left-6 z-20 flex justify-between text-xs font-semibold text-white">
          <span>23:47</span>
          <span className="inline-block h-2 w-3.5 rounded-[2px] border border-white" />
        </div>

        <div
          key={screen}
          className="absolute inset-0 animate-in fade-in slide-in-from-right-4 pt-[54px] duration-500"
        >
          {screen === 'discover' ? <DiscoverScreen /> : null}
          {screen === 'venue' ? <VenueScreen /> : null}
          {screen === 'pay' ? <PayScreen /> : null}
          {screen === 'qr' ? <QrScreen /> : null}
          {screen === 'in' ? <InScreen /> : null}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// 1) Discover
// ────────────────────────────────────────────────

function DiscoverScreen() {
  const venues = [
    { n: 'Razzmatazz', t: 'House · 2.4 km', p: 80 },
    { n: 'Macarena Club', t: 'Latino · 0.8 km', p: 35 },
    { n: 'Moog', t: 'Electro · 1.1 km', p: 92 },
  ];
  const accent = (p: number) =>
    p > 85 ? 'text-fuchsia-400' : p > 60 ? 'text-amber-400' : 'text-emerald-300';
  return (
    <div className="px-4 pb-4">
      <div className="text-[11px] font-medium tracking-[0.1em] text-white/55 uppercase">
        ESTA NOCHE · MADRID
      </div>
      <div className="mt-1 font-display text-[26px] font-bold tracking-[-0.02em] text-white">
        Cerca de ti
      </div>
      <div
        className="relative mt-3.5 h-40 overflow-hidden rounded-2xl"
        style={{ background: 'linear-gradient(135deg, hsl(290 50% 25%), hsl(260 55% 15%))' }}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 12px)',
          }}
        />
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold tracking-[0.04em] text-emerald-300 uppercase">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_currentColor]" />
            LIVE · 142
          </span>
        </div>
        <div className="absolute right-3 bottom-2.5 left-3 text-white">
          <div className="font-display text-base font-bold">Sala Apolo</div>
          <div className="text-[11px] opacity-80">Techno · 1.2 km · Cover desde €12</div>
        </div>
      </div>
      <div className="mt-2">
        {venues.map((b, i) => (
          <div
            key={b.n}
            className={`flex items-center gap-2.5 py-2.5 ${
              i < venues.length - 1 ? 'border-b border-white/10' : ''
            }`}
          >
            <div
              className="size-9 shrink-0 rounded-[10px]"
              style={{
                background: `linear-gradient(135deg, hsl(${260 + i * 20} 50% 25%), hsl(${290 + i * 15} 50% 15%))`,
              }}
            />
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-white">{b.n}</div>
              <div className="mt-0.5 text-[10px] text-white/55">{b.t}</div>
            </div>
            <div className={`text-[10px] font-semibold ${accent(b.p)}`}>{b.p}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// 2) Venue
// ────────────────────────────────────────────────

function VenueScreen() {
  return (
    <div className="px-4 pb-4">
      <div className="flex items-center justify-between">
        <div className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white">
          <ArrowLeft className="size-4" />
        </div>
        <div className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white">
          <Share2 className="size-4" />
        </div>
      </div>
      <div
        className="relative mt-3 h-44 overflow-hidden rounded-2xl"
        style={{ background: 'linear-gradient(135deg, hsl(290 50% 28%), hsl(260 55% 14%))' }}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 12px)',
          }}
        />
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold tracking-[0.04em] text-emerald-300 uppercase">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_currentColor]" />
            LIVE · 142
          </span>
        </div>
      </div>
      <div className="mt-3">
        <div className="font-display text-xl font-bold text-white">Sala Apolo</div>
        <div className="mt-0.5 text-[11px] text-white/55">
          Techno · Industrial · 1.2 km · Madrid
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1 text-[11px] text-white/70">
        <Star className="size-3 fill-current text-amber-300" />
        4.7 · 312 reseñas
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-[10px] tracking-[0.06em] uppercase">
          <span className="text-white/55">Aforo</span>
          <span className="font-semibold text-fuchsia-400">92%</span>
        </div>
        <div className="mt-1 h-[5px] overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full"
            style={{ width: '92%', background: '#f0abfc', boxShadow: '0 0 12px #f0abfc' }}
          />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
          <div className="text-[9px] tracking-[0.06em] text-white/45 uppercase">Cover</div>
          <div className="mt-0.5 font-display text-base font-bold text-white">€12</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
          <div className="text-[9px] tracking-[0.06em] text-white/45 uppercase">Cierra</div>
          <div className="mt-0.5 font-display text-base font-bold text-white">06:00</div>
        </div>
      </div>
      <button
        type="button"
        className="mt-3 w-full rounded-xl py-3 text-[13px] font-semibold text-white"
        style={{
          background: 'linear-gradient(180deg, #a855f7 0%, #9333ea 100%)',
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.08) inset, 0 8px 24px -6px rgba(168,85,247,0.6)',
        }}
      >
        Comprar cover · €12
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────
// 3) Pay
// ────────────────────────────────────────────────

function PayScreen() {
  return (
    <div className="flex h-full flex-col px-4 pb-4">
      <div className="flex items-center justify-between">
        <div className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white">
          <ArrowLeft className="size-4" />
        </div>
        <div className="text-[11px] font-medium tracking-[0.06em] text-white/55 uppercase">
          Cover
        </div>
        <div className="size-8" />
      </div>
      <div className="mt-3 font-display text-xl font-bold text-white">Tu compra</div>
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <div
          className="size-12 shrink-0 rounded-xl"
          style={{ background: 'linear-gradient(135deg, hsl(290 50% 25%), hsl(260 55% 15%))' }}
        />
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-white">Sala Apolo</div>
          <div className="mt-0.5 text-[10px] text-white/55">1 entrada · Techno · 23:47</div>
        </div>
      </div>
      <div className="mt-3 space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex justify-between text-[11px]">
          <span className="text-white/55">Cover</span>
          <span className="text-white">€12.00</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-white/55">Servicio</span>
          <span className="text-white">€0.00</span>
        </div>
        <div className="my-1 h-px bg-white/10" />
        <div className="flex justify-between">
          <span className="text-[12px] font-semibold text-white">Total</span>
          <span className="font-display text-lg font-bold text-white">€12.00</span>
        </div>
      </div>
      <div className="mt-auto space-y-2">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-[13px] font-semibold text-black"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
            <path d="M16.4 12.6c0-2.4 2-3.5 2.1-3.6-1.1-1.6-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1.9-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.5 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.7 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.5-.9-2.5-3.8M14.2 5.2c.7-.8 1.1-1.9 1-3-1 0-2.1.6-2.8 1.4-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.5 2.8-1.3" />
          </svg>
          Pagar con Apple Pay
        </button>
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-white/45">
          <Lock className="size-3" />
          Pago seguro · Stripe
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// 4) QR
// ────────────────────────────────────────────────

function QrScreen() {
  const cells = Array.from({ length: 81 }, (_, i) => (i * 31 + 7) % 5 < 3);
  return (
    <div className="flex h-full flex-col items-center px-4 pb-4">
      <div className="mt-1 text-center">
        <div className="text-[11px] font-medium tracking-[0.1em] text-primary uppercase">
          Tu pase
        </div>
        <div className="mt-1 font-display text-xl font-bold text-white">Sala Apolo</div>
        <div className="mt-0.5 text-[11px] text-white/55">23:47 · NP-2A4F</div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <div className="grid size-[170px] grid-cols-9 gap-[1.5px] rounded-xl bg-white p-2">
          {cells.map((on, i) => (
            <div key={i} className={`rounded-[1px] ${on ? 'bg-[#0a0a0f]' : 'bg-white'}`} />
          ))}
        </div>
      </div>

      <div className="mt-4 text-center text-[11px] leading-relaxed text-white/55">
        Muestra este código en la puerta.
        <br />
        Vence en 47 minutos.
      </div>

      <div className="mt-auto w-full rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] tracking-[0.06em] text-white/45 uppercase">Estado</div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_currentColor]" />
            ACTIVO
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// 5) In
// ────────────────────────────────────────────────

function InScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 pb-4 text-center">
      <div className="grid size-24 place-items-center rounded-full bg-emerald-500/20 ring-4 ring-emerald-500/10">
        <div className="grid size-16 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.6)]">
          <Check className="size-8" strokeWidth={3} />
        </div>
      </div>
      <div className="mt-6 font-display text-3xl font-bold text-white">¡Adelante!</div>
      <div className="mt-1 text-[12px] text-white/55">QR escaneado · 23:51</div>

      <div className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center gap-3">
          <div
            className="size-10 shrink-0 rounded-xl"
            style={{ background: 'linear-gradient(135deg, hsl(290 50% 25%), hsl(260 55% 15%))' }}
          />
          <div className="flex-1 text-left">
            <div className="text-[12px] font-semibold text-white">Sala Apolo</div>
            <div className="mt-0.5 text-[10px] text-white/55">Techno · Cover €12 · 1 entrada</div>
          </div>
          <Check className="size-4 text-emerald-300" />
        </div>
      </div>

      <div className="mt-auto pt-6 text-[10px] tracking-[0.18em] text-white/35 uppercase">
        Disfruta · NightPass
      </div>
    </div>
  );
}
