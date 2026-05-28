import { cn } from '@/core/lib/utils/cn';
import type { LoyaltyTier } from '@/core/types/api';
import { TIER_STYLES } from '../lib/tier-styles';

interface PointsProgressProps {
  yearPoints: number;
  nextTier: LoyaltyTier | null;
  pointsToNext: number | null;
  hideTierName?: boolean;
  className?: string;
}

export function PointsProgress({
  yearPoints,
  nextTier,
  pointsToNext,
  hideTierName = false,
  className,
}: PointsProgressProps) {
  if (!nextTier || pointsToNext == null) {
    return (
      <div className={cn('rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-[11px] font-semibold text-amber-200', className)}>
        {hideTierName ? 'Has alcanzado el máximo.' : 'Tier máximo alcanzado.'}
      </div>
    );
  }

  const total = yearPoints + pointsToNext;
  const pct = total > 0 ? Math.min(100, Math.max(2, Math.round((yearPoints / total) * 100))) : 2;
  const nextLabel = TIER_STYLES[nextTier].label;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] shadow-[0_0_18px_rgba(168,85,247,0.45)] transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="font-mono text-white/70 tabular-nums">
          {yearPoints.toLocaleString('es-MX')} NPP
        </span>
        <span className="text-white/45">
          {hideTierName ? (
            <>{pointsToNext.toLocaleString('es-MX')} para el siguiente nivel</>
          ) : (
            <>
              {pointsToNext.toLocaleString('es-MX')} para{' '}
              <span className="font-semibold text-primary/80">{nextLabel}</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
