'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  /** Frase central mientras dura el salto. */
  tagline?: string;
  /** Se llama cuando termina la animación (momento de navegar). */
  onComplete: () => void;
}

const WARP_MS = 1500;

/**
 * Transición "salto hiperespacio a otra galaxia" al comprar: un campo de
 * estrellas (canvas) que salen disparadas desde el centro como rayos de luz,
 * acelerando hasta el salto, con un núcleo que se enciende y un flash final que
 * tapa el corte al checkout. Portal a `body` (z máximo) para cubrir header/nav.
 * Llama `onComplete` al terminar — ahí navega quien lo usa.
 *
 * Respeta `prefers-reduced-motion`: sin canvas, solo un fade rápido.
 */
export function WarpOverlay({ tagline = 'Entrando a tu mejor noche…', onComplete }: Props) {
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(onComplete, reduce ? 420 : WARP_MS);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [onComplete]);

  // Campo de estrellas en canvas — solo si el usuario no pidió reducir motion.
  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const cx = () => w / 2;
    const cy = () => h / 2;
    const maxZ = Math.max(w, h);
    const focal = w * 0.85;
    // Menos estrellas en móvil para no tirar el frame-rate.
    const COUNT = w < 640 ? 320 : 620;

    type Star = { x: number; y: number; z: number };
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const stars: Star[] = Array.from({ length: COUNT }, () => ({
      x: rand(-w, w),
      y: rand(-h, h),
      z: rand(1, maxZ),
    }));

    const start = performance.now();
    let raf = 0;
    let last = start;

    const tick = (nowTs: number) => {
      const elapsed = (nowTs - start) / WARP_MS; // 0 → 1
      const dt = Math.min((nowTs - last) / 16.67, 3); // frames-equivalentes
      last = nowTs;

      // Velocidad: arranca lento, BLAST al final (ease cuadrática).
      const speed = (3 + 120 * elapsed * elapsed) * dt;
      // Fade-in al inicio para que no aparezca de golpe.
      const fadeIn = Math.min(elapsed / 0.12, 1);

      ctx.clearRect(0, 0, w, h);

      // Núcleo central que se enciende conforme nos acercamos al salto.
      const bloomR = w * (0.06 + 0.5 * elapsed * elapsed);
      const bloom = ctx.createRadialGradient(cx(), cy(), 0, cx(), cy(), bloomR);
      bloom.addColorStop(0, `rgba(255,255,255,${0.5 * fadeIn})`);
      bloom.addColorStop(0.35, `rgba(216,180,254,${0.32 * fadeIn})`);
      bloom.addColorStop(1, 'rgba(147,51,234,0)');
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(cx(), cy(), bloomR, 0, Math.PI * 2);
      ctx.fill();

      for (const s of stars) {
        const prevZ = s.z;
        s.z -= speed;
        if (s.z < 1) {
          // Respawn al fondo con nueva posición.
          s.x = rand(-w, w);
          s.y = rand(-h, h);
          s.z = maxZ;
          continue;
        }
        const k = focal / s.z;
        const sx = cx() + s.x * k;
        const sy = cy() + s.y * k;
        const pk = focal / prevZ;
        const px = cx() + s.x * pk;
        const py = cy() + s.y * pk;

        const depth = 1 - s.z / maxZ; // 0 lejos → 1 cerca
        const lw = depth * 2.6 + 0.4;
        // Lejos violeta, cerca blanco.
        const r = Math.round(216 + (255 - 216) * depth);
        const g = Math.round(180 + (255 - 180) * depth);
        const b = 254;
        const a = (0.25 + 0.75 * depth) * fadeIn;

        ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }

      if (nowTs - start < WARP_MS) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-hidden
      className="fixed inset-0 z-[200] overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 50% 50%, #160826 0%, #0a0612 55%, #000 100%)',
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Frase en el tercio inferior — fuera del núcleo para que se lea. */}
      <div className="absolute inset-x-0 bottom-[16vh] flex justify-center px-8">
        <p className="np-warp-text text-center font-display text-xl font-bold tracking-tight text-white drop-shadow-[0_2px_24px_rgba(168,85,247,0.9)] sm:text-2xl">
          {tagline}
        </p>
      </div>

      <div className="np-warp-flash" />
    </div>,
    document.body,
  );
}
