import Image from 'next/image';
import { Gift, Sparkles } from 'lucide-react';
import { type CatalogEventPromo } from '@/core/types/api';

interface Props {
  promos: CatalogEventPromo[];
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Banner de "promo por volumen" (BULK_PROMO) en la página del evento.
 * Si el promo tiene `imageUrl` se muestra la imagen como banner; si no, una
 * card de solo texto con icono de regalo. Sin promos → no renderiza nada.
 */
export function EventPromoBanner({ promos, className, style }: Props) {
  if (!promos.length) return null;

  return (
    <section className={`np-rise space-y-4 ${className ?? ''}`} style={style}>
      {promos.map((promo) => {
        const optionChips = (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {promo.options.map((opt, i) => (
              <li
                key={`${promo.id}-opt-${i}`}
                className="inline-flex items-center rounded-full border border-white/18 bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-white/85 backdrop-blur"
              >
                {opt.label}
              </li>
            ))}
          </ul>
        );

        const eyebrow = (
          <p className="inline-flex items-center gap-1 rounded-full border border-purple-300/30 bg-purple-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-200">
            <Sparkles className="size-3" />
            Promo
          </p>
        );

        const headline = (
          <p className="mt-2 text-sm font-semibold text-white">
            Compra {promo.minQuantity} boletos y elige tu regalo
          </p>
        );

        if (promo.imageUrl) {
          return (
            <div
              key={promo.id}
              className="overflow-hidden rounded-[22px] border border-white/14 bg-gradient-to-br from-purple-900/40 to-purple-600/10"
            >
              {/* Flyer completo a todo el ancho (como el flyer del evento). */}
              <Image
                src={promo.imageUrl}
                alt={promo.title}
                width={1080}
                height={1920}
                sizes="(max-width: 768px) 100vw, 768px"
                className="h-auto w-full object-contain"
              />
              <div className="p-5 sm:p-6">
                {eyebrow}
                <h2 className="mt-2 font-display text-lg font-bold leading-tight tracking-tight text-white">
                  {promo.title}
                </h2>
                {promo.description ? (
                  <p className="mt-1 text-sm text-white/70">{promo.description}</p>
                ) : null}
                {headline}
                {optionChips}
              </div>
            </div>
          );
        }

        return (
          <div
            key={promo.id}
            className="overflow-hidden rounded-[22px] border border-white/14 bg-gradient-to-br from-purple-900/40 to-purple-600/10 p-5 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-purple-300/30 bg-purple-500/15 text-purple-200">
                <Gift className="size-5" />
              </span>
              <div className="min-w-0">
                {eyebrow}
                <h2 className="mt-2 font-display text-lg font-bold leading-tight tracking-tight text-white">
                  {promo.title}
                </h2>
                {promo.description ? (
                  <p className="mt-1 text-sm text-white/70">{promo.description}</p>
                ) : null}
                {headline}
                {optionChips}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
