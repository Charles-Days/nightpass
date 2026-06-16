'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, ImageIcon } from 'lucide-react';

interface Props {
  src: string;
  title: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Flyer del evento en una sección colapsable. El flyer (1080x1920) a alto
 * completo satura la pantalla y suele repetir lo que ya muestra la portada del
 * hero. Por eso arranca CERRADO: solo una franja con "Ver flyer completo" y se
 * despliega bajo demanda — quien quiera el arte lo abre, el resto no carga
 * scroll de más.
 */
export function EventFlyer({ src, title, className, style }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section
      className={`np-rise overflow-hidden rounded-[22px] border border-white/14 bg-white/[0.05] ${className ?? ''}`}
      style={style}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-white/[0.03] active:scale-[0.99]"
      >
        <span className="flex items-center gap-2.5">
          <ImageIcon className="size-4 shrink-0 text-primary" />
          <span className="text-sm font-semibold text-white">
            {open ? 'Flyer del evento' : 'Ver flyer completo'}
          </span>
        </span>
        {open ? (
          <ChevronUp className="size-4 shrink-0 text-white/60" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-white/60" />
        )}
      </button>

      {open && (
        <Image
          src={src}
          alt={`Flyer — ${title}`}
          width={1080}
          height={1920}
          sizes="(max-width: 768px) 100vw, 768px"
          className="h-auto w-full border-t border-white/10 object-contain"
        />
      )}
    </section>
  );
}
