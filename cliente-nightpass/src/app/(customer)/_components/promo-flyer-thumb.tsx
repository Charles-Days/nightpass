'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Expand, X } from 'lucide-react';

interface Props {
  src: string;
  alt: string;
}

/**
 * Miniatura del flyer de promo que abre el arte completo en un lightbox a
 * pantalla completa al tocarse. Mantiene el banner compacto (no satura el
 * detalle del evento) pero deja ver el flyer en grande bajo demanda.
 */
export function PromoFlyerThumb({ src, alt }: Props) {
  const [open, setOpen] = useState(false);

  // Bloquea el scroll del fondo y permite cerrar con Escape mientras está abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver flyer de la promo completo"
        className="group relative shrink-0 overflow-hidden rounded-2xl border border-white/10 transition active:scale-95"
      >
        <Image
          src={src}
          alt={alt}
          width={224}
          height={298}
          sizes="120px"
          className="aspect-[3/4] w-24 object-cover sm:w-28"
        />
        <span className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/40 to-transparent p-1.5">
          <span className="grid size-6 place-items-center rounded-full bg-black/55 text-white/90 backdrop-blur">
            <Expand className="size-3.5" />
          </span>
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          className="np-rise fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition active:scale-95 hover:bg-white/20"
          >
            <X className="size-5" />
          </button>
          <Image
            src={src}
            alt={alt}
            width={1080}
            height={1920}
            sizes="100vw"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-auto max-w-full rounded-2xl object-contain"
          />
        </div>
      )}
    </>
  );
}
