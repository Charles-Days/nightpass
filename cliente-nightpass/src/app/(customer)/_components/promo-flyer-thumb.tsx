'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
 *
 * El lightbox se renderiza en un portal a `document.body`: la página del evento
 * vive en un contexto de apilado por debajo de la barra inferior, así que un
 * overlay anidado quedaría DEBAJO del nav. El portal lo saca a la raíz para que
 * tape todo (header + nav incluidos).
 */
export function PromoFlyerThumb({ src, alt }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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

      {mounted &&
        open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setOpen(false)}
            className="np-rise fixed inset-0 z-[100] flex flex-col bg-black/95"
          >
            {/* Banda superior con la X — fuera de la foto, respeta el notch. */}
            <div
              className="flex shrink-0 justify-end px-4"
              style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)', paddingBottom: '0.5rem' }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition active:scale-95 hover:bg-white/20"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Foto centrada en el espacio restante. */}
            <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <Image
                src={src}
                alt={alt}
                width={1080}
                height={1920}
                sizes="100vw"
                onClick={(e) => e.stopPropagation()}
                className="max-h-full w-auto max-w-full rounded-2xl object-contain"
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
