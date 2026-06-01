'use client';

import { memo, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  threshold?: number;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function RevealImpl({ children, delay = 0, className = '', threshold = 0.15 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Accesibilidad + perf: si el usuario pide menos movimiento, mostrar el
    // estado final directo sin observer ni transición.
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  const style: CSSProperties | undefined = delay ? { transitionDelay: `${delay}ms` } : undefined;

  return (
    <div
      ref={ref}
      className={`np-reveal ${visible ? 'is-visible' : ''} ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
}

export const Reveal = memo(RevealImpl);
