import { cn } from '@/core/lib/utils/cn';
import type { LoyaltyTier } from '@/core/types/api';
import { TIER_STYLES } from '../lib/tier-styles';

interface TierBadgeProps {
  tier: LoyaltyTier;
  size?: 'sm' | 'md';
  className?: string;
}

export function TierBadge({ tier, size = 'md', className }: TierBadgeProps) {
  const style = TIER_STYLES[tier];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-[0.16em]',
        size === 'sm'
          ? 'px-2 py-0.5 text-[10px]'
          : 'px-2.5 py-1 text-[11px]',
        style.chipClass,
        className,
      )}
    >
      {style.label}
    </span>
  );
}
