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
 * tape todo (header + nav incluidos). Fondo lava morado (mismo lenguaje que
 * login/landing) en vez de negro plano.
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
            className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-background"
          >
            {/* Fondo lava morado (mismo lenguaje que login/landing), opaco. */}
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="lava-aurora" />
              <div className="lava-blob lava-blob-1" />
              <div className="lava-blob lava-blob-2" />
              <div className="lava-blob lava-blob-3" />
              <div className="lava-blob lava-blob-4" />
              <div className="lava-spark lava-spark-1" />
              <div className="lava-spark lava-spark-2" />
              <div className="lava-spark lava-spark-3" />
              <div className="lava-vignette" />
            </div>

            {/* Banda superior con la X — fuera de la foto, respeta el notch. */}
            <div
              className="relative z-10 flex shrink-0 justify-end px-4"
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

            {/* Foto centrada en el espacio restante, con halo morado detrás. */}
            <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              {/* Halo: bloom morado que despega la foto del fondo lava. */}
              <div
                aria-hidden
                className="pointer-events-none absolute size-[78vmin] rounded-full blur-3xl"
                style={{
                  background:
                    'radial-gradient(circle, rgba(168,85,247,0.45) 0%, rgba(147,51,234,0.18) 45%, rgba(147,51,234,0) 70%)',
                }}
              />
              <Image
                src={src}
                alt={alt}
                width={1080}
                height={1920}
                sizes="100vw"
                onClick={(e) => e.stopPropagation()}
                className="relative max-h-full w-auto max-w-full rounded-2xl object-contain ring-1 ring-white/10 shadow-[0_0_120px_-20px_rgba(168,85,247,0.7)]"
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
