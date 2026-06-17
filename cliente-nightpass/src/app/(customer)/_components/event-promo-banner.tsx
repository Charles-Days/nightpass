import { Gift, Sparkles } from 'lucide-react';
import { type CatalogEventPromo } from '@/core/types/api';
import { PromoFlyerThumb } from '@/app/(customer)/_components/promo-flyer-thumb';

interface Props {
  promos: CatalogEventPromo[];
  className?: string;
  style?: React.CSSProperties;
}

const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'long' }).format(
    new Date(iso),
  );

/**
 * Banner de "promo por volumen" (BULK_PROMO) en la página del evento.
 * Si el promo tiene `imageUrl` se muestra una card horizontal compacta con la
 * imagen como miniatura a la izquierda y el texto a la derecha; si no, una
 * card de solo texto con icono de regalo. Sin promos → no renderiza nada.
 */
export function EventPromoBanner({ promos, className, style }: Props) {
  if (!promos.length) return null;

  return (
    <section className={`np-rise space-y-4 ${className ?? ''}`} style={style}>
      {promos.map((promo) => {
        const isPerk = promo.kind === 'PURCHASE_PERK';

        // El perk por compra no tiene opciones a elegir; la promo por volumen sí.
        const optionChips =
          isPerk || promo.options.length === 0 ? null : (
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

        const headline = isPerk ? (
          <p className="mt-2 text-sm font-semibold text-white">
            {promo.endsAt
              ? `Compra tu boleto antes del ${fmtDay(promo.endsAt)} y es tuyo`
              : 'Compra tu boleto y es tuyo'}
          </p>
        ) : (
          <p className="mt-2 text-sm font-semibold text-white">
            Compra {promo.minQuantity} boletos y elige tu regalo
          </p>
        );

        if (promo.imageUrl) {
          return (
            // Card con forma de BOLETO: stub (miniatura) + perforación + muescas
            // laterales, con un brillo foil holográfico que la barre en loop.
            <div
              key={promo.id}
              className="relative overflow-hidden rounded-[22px] border border-white/14 bg-gradient-to-br from-purple-900/40 to-purple-600/10"
            >
              <div className="flex items-stretch">
                {/* Stub: miniatura del flyer; tap → lightbox a pantalla completa. */}
                <div className="flex w-28 shrink-0 items-center justify-center p-2 sm:w-32">
                  <PromoFlyerThumb src={promo.imageUrl} alt={promo.title} />
                </div>
                {/* Cuerpo del boleto. */}
                <div className="min-w-0 flex-1 p-4 pl-5 sm:p-5">
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

              {/* Perforación vertical entre el stub y el cuerpo. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-3 left-28 w-px border-l border-dashed border-white/25 sm:left-32"
              />
              {/* Muescas tipo boleto en los extremos de la perforación. */}
              <span
                aria-hidden
                className="pointer-events-none absolute -top-2 left-[6.5rem] size-4 rounded-full bg-background sm:left-[7.5rem]"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-2 left-[6.5rem] size-4 rounded-full bg-background sm:left-[7.5rem]"
              />
              {/* Brillo foil holográfico (rota por el ::after en globals.css). */}
              <span
                aria-hidden
                className="np-foil pointer-events-none absolute inset-0 rounded-[22px]"
              />
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
