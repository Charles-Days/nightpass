'use client';

import { memo, useEffect, useRef, useState } from 'react';

interface CounterProps {
  to: number;
  from?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function CounterImpl({
  to,
  from = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1400,
}: CounterProps) {
  const [val, setVal] = useState(from);
  const ref = useRef<HTMLSpanElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Sin animación si el usuario pide menos movimiento: salta al valor final.
    if (prefersReducedMotion()) {
      setVal(to);
      return;
    }

    const start = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(from + (to - from) * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === 'undefined') {
      start();
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          start();
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [from, to, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export const Counter = memo(CounterImpl);
