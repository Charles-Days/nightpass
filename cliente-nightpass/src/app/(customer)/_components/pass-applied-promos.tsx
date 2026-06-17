import { Gift, Sparkles, TicketPercent } from 'lucide-react';
import type { AppliedPromo } from '@/core/types/api';
import { PromoFlyerThumb } from './promo-flyer-thumb';

const money = (cents: number) => `$${(cents / 100).toFixed(2)} MXN`;

/** Etiqueta corta por tipo de promo, para el eyebrow de cada card. */
function kindLabel(kind: AppliedPromo['kind']): string {
  switch (kind) {
    case 'PURCHASE_PERK':
      return 'Promo por tu compra';
    case 'BULK_PROMO':
      return 'Promo por volumen';
    case 'TICKET_DISCOUNT':
      return 'Descuento aplicado';
    case 'VENUE_PERK':
      return 'Perk';
    default:
      return 'Promo';
  }
}

/**
 * Promos aplicadas a la orden de un pase, al pie del boleto. Cada una se pinta
 * como una mini-card con su descripción, imagen (lightbox) y el código que el
 * cliente presenta en barra/puerta. Cubre cualquier tipo de promo (perk por
 * compra, volumen, descuento) — todas las que el cliente tenga para esa orden.
 */
export function PassAppliedPromos({ promos }: { promos: AppliedPromo[] }) {
  if (!promos || promos.length === 0) return null;

  return (
    <div className="mt-5 space-y-3">
      <p className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        <Sparkles className="size-3.5" />
        Promos aplicadas
      </p>

      {promos.map((p) => {
        const isDiscount = p.kind === 'TICKET_DISCOUNT';
        return (
          <div
            key={p.id}
            className="relative overflow-hidden rounded-[18px] border border-primary/25 bg-gradient-to-br from-primary/[0.07] via-white/[0.03] to-white/[0.02] p-4"
          >
            {/* destello holográfico sutil (mismo lenguaje que la card de promo) */}
            <span className="pointer-events-none absolute inset-0 np-foil opacity-40" />

            <div className="relative flex gap-3">
              {p.imageUrl ? (
                <PromoFlyerThumb src={p.imageUrl} alt={p.title} />
              ) : (
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                  {isDiscount ? (
                    <TicketPercent className="size-5" />
                  ) : (
                    <Gift className="size-5" />
                  )}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">
                  {kindLabel(p.kind)}
                </p>
                <p className="mt-0.5 font-display text-base font-bold leading-tight text-white">
                  {p.title}
                </p>

                {p.optionLabel && (
                  <p className="mt-1 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                    Elegiste: {p.optionLabel}
                  </p>
                )}

                {p.description && (
                  <p className="mt-1 text-[13px] leading-snug text-white/75">
                    {p.description}
                  </p>
                )}

                {isDiscount && p.appliedCents != null ? (
                  <p className="mt-2 text-sm font-semibold text-emerald-300">
                    −{money(p.appliedCents)} en tu compra
                  </p>
                ) : (
                  <div className="mt-2">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Muestra este código
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-semibold tracking-wider text-white">
                      {p.code}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
