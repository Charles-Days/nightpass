import { Flame, Snowflake } from 'lucide-react';
import { cn } from '@/core/lib/utils/cn';
import type { LoyaltyStreak } from '@/core/types/api';

interface StreakBadgeProps {
  streak: Pick<LoyaltyStreak, 'current' | 'freezesRemaining'>;
  className?: string;
}

export function StreakBadge({ streak, className }: StreakBadgeProps) {
  const active = streak.current > 0;
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        active
          ? 'border-orange-400/35 bg-orange-500/15 text-orange-200'
          : 'border-white/10 bg-white/[0.04] text-white/55',
        className,
      )}
    >
      <Flame
        className={cn('size-3.5', active ? 'fill-current' : '')}
        strokeWidth={2}
      />
      <span className="tabular-nums">
        {streak.current} {streak.current === 1 ? 'día' : 'días'}
      </span>
      {streak.freezesRemaining < 2 ? (
        <span className="inline-flex items-center gap-0.5 rounded-full border border-sky-400/30 bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-sky-200">
          <Snowflake className="size-2.5" />
          {streak.freezesRemaining}/2
        </span>
      ) : null}
    </div>
  );
}
