import { Flame } from 'lucide-react';
import { cn } from '@/core/lib/utils/cn';

interface Props {
  sold?: number | null;
  capacity?: number | null;
  /** Variante chica para las cards de la lista. */
  compact?: boolean;
  className?: string;
}

// Indicador de aforo basado en pases vendidos (Stripe + efectivo). Pinta una
// barra de llenado + un estado: "En tendencia" (>70%), "Casi agotado" (>90%),
// "Agotado" (100%). No expone números de inventario, solo el porcentaje.
export function EventAforo({ sold, capacity, compact, className }: Props) {
  if (capacity == null || capacity <= 0) return null;

  const pct = Math.min(100, Math.round(((sold ?? 0) / capacity) * 100));
  const full = pct >= 100;
  const almost = pct >= 90;
  const trending = pct >= 70;

  const label = full
    ? 'Agotado'
    : almost
      ? 'Casi agotado'
      : trending
        ? 'En tendencia'
        : `${pct}% lleno`;

  const tone = full || almost ? 'text-rose-300' : trending ? 'text-amber-300' : 'text-white/55';
  const bar = full || almost ? 'bg-rose-400' : trending ? 'bg-amber-400' : 'bg-primary';

  return (
    <div className={cn('w-full', compact ? 'space-y-1' : 'space-y-1.5', className)}>
      <div className={cn('flex items-center gap-1 font-semibold', compact ? 'text-[10px]' : 'text-[11px]', tone)}>
        {trending && <Flame className={compact ? 'size-2.5' : 'size-3'} />}
        <span>{label}</span>
      </div>
      <div className={cn('w-full overflow-hidden rounded-full bg-white/10', compact ? 'h-1' : 'h-1.5')}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', bar)}
          style={{ width: `${Math.max(pct, 4)}%` }}
        />
      </div>
    </div>
  );
}
