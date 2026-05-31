'use client';

import { useMemo } from 'react';

// Capa decorativa cinematográfica que se monta encima de la portada del evento:
// dos auroras de color que respiran + chispas (embers) que suben. Es puramente
// estética y `aria-hidden` — el contenido real (h1, fecha) sigue server-rendered
// debajo, así que no toca SEO ni accesibilidad. Respeta prefers-reduced-motion
// vía las clases .np-aurora / .np-ember (ver globals.css).

// PRNG determinista por semilla → mismas chispas en server y cliente (sin
// hydration mismatch) pero distinto layout por evento.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const EMBER_COUNT = 14;

export function EventHeroFx({ seed = 'nightpass' }: { seed?: string }) {
  const embers = useMemo(() => {
    const rand = mulberry32(hashSeed(seed));
    return Array.from({ length: EMBER_COUNT }, () => {
      const size = 2 + rand() * 5;
      return {
        left: `${rand() * 100}%`,
        size: `${size.toFixed(1)}px`,
        dur: `${(5 + rand() * 6).toFixed(2)}s`,
        delay: `${(rand() * 6).toFixed(2)}s`,
        drift: `${(rand() * 40 - 20).toFixed(0)}px`,
        peak: (0.4 + rand() * 0.5).toFixed(2),
      };
    });
  }, [seed]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Auroras: una violeta arriba-izq, una rosa abajo-der. */}
      <div
        className="np-aurora left-[-10%] w-[55%]"
        style={{
          background:
            'radial-gradient(closest-side, rgba(168,85,247,0.55), rgba(168,85,247,0) 72%)',
        }}
      />
      <div
        className="np-aurora right-[-10%] left-auto w-[50%]"
        style={{
          background:
            'radial-gradient(closest-side, rgba(236,72,153,0.4), rgba(236,72,153,0) 72%)',
          animationDelay: '-7s',
        }}
      />
      {/* Embers. */}
      {embers.map((e, i) => (
        <span
          key={i}
          className="np-ember"
          style={
            {
              left: e.left,
              width: e.size,
              height: e.size,
              '--np-ember-dur': e.dur,
              '--np-ember-delay': e.delay,
              '--np-ember-drift': e.drift,
              '--np-ember-peak': e.peak,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
