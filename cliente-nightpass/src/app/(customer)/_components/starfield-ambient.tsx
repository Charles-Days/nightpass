'use client';

import { useEffect, useRef } from 'react';

/**
 * Fondo espacial ambiental (canvas): campo de estrellas que titilan y se
 * desplazan lento, sobre una nebulosa morada que respira. Mismo lenguaje que el
 * warp de "comprar boletos" pero calmado, para ambientar el lightbox del flyer.
 * Loop continuo mientras está montado. Respeta `prefers-reduced-motion` (un solo
 * frame estático).
 */
export function StarfieldAmbient() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth;
    let h = window.innerHeight;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const N = w < 640 ? 120 : 190;
    const stars = Array.from({ length: N }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      r: rand(0.4, 1.8),
      a: rand(0.2, 0.9),
      tw: rand(0.5, 2),
      ph: rand(0, Math.PI * 2),
      vx: rand(-7, 7) / 1000,
      vy: rand(-7, 7) / 1000,
      violet: Math.random() < 0.5,
    }));

    // Nebulosas que oscilan suave (parallax lento).
    const blobs = [
      { x: 0.3, y: 0.34, c: '168,85,247' },
      { x: 0.72, y: 0.62, c: '147,51,234' },
      { x: 0.5, y: 0.86, c: '88,28,135' },
    ];

    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      // Base espacio.
      const bg = ctx.createRadialGradient(
        w * 0.5, h * 0.42, 0,
        w * 0.5, h * 0.42, Math.max(w, h) * 0.85,
      );
      bg.addColorStop(0, '#170927');
      bg.addColorStop(0.6, '#0a0612');
      bg.addColorStop(1, '#050308');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Nebulosas.
      for (const b of blobs) {
        const bx = (b.x + Math.sin(t * 0.07 + b.x * 6) * 0.04) * w;
        const by = (b.y + Math.cos(t * 0.06 + b.y * 6) * 0.04) * h;
        const R = Math.min(w, h) * 0.6;
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, R);
        g.addColorStop(0, `rgba(${b.c},0.22)`);
        g.addColorStop(0.5, `rgba(${b.c},0.07)`);
        g.addColorStop(1, `rgba(${b.c},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, R, 0, Math.PI * 2);
        ctx.fill();
      }

      // Estrellas: titilan + deriva muy lenta (wrap en los bordes).
      for (const s of stars) {
        if (!reduce) {
          s.x += s.vx * 16;
          s.y += s.vy * 16;
          if (s.x < 0) s.x += w;
          else if (s.x > w) s.x -= w;
          if (s.y < 0) s.y += h;
          else if (s.y > h) s.y -= h;
        }
        const a = reduce ? s.a : s.a * (0.55 + 0.45 * Math.sin(t * s.tw + s.ph));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.violet
          ? `rgba(216,180,254,${a})`
          : `rgba(255,255,255,${a})`;
        ctx.fill();
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
