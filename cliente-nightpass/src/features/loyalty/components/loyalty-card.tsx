'use client';

import Link from 'next/link';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { paths } from '@/core/config/paths';
import { cn } from '@/core/lib/utils/cn';
import { TIER_STYLES } from '../lib/tier-styles';
import { TierBadge } from './tier-badge';
import { StreakBadge } from './streak-badge';
import { PointsProgress } from './points-progress';
import { useLoyaltyStatus } from '../hooks/use-loyalty-status';

interface LoyaltyCardProps {
  variant?: 'compact' | 'hero';
  hideTierNames?: boolean;
  className?: string;
}

export function LoyaltyCard({ variant = 'compact', hideTierNames = false, className }: LoyaltyCardProps) {
  const { data, isLoading, isError } = useLoyaltyStatus();

  if (isLoading) {
    return (
      <div
        className={cn(
          'rounded-[22px] border border-white/10 bg-white/[0.025] p-6',
          variant === 'hero' && 'p-8',
          className,
        )}
      >
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando tu estado…
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div
        className={cn(
          'rounded-[22px] border border-white/10 bg-white/[0.025] p-6',
          className,
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Tu estado
        </p>
        <p className="mt-3 font-display text-xl font-bold tracking-tight">
          Aún sin actividad
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Empieza tu primera noche para ganar puntos NightPass.
        </p>
        <Link
          href={paths.recompensas}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          Cómo funciona <ArrowRight className="size-3.5" />
        </Link>
      </div>
    );
  }

  const tierStyle = TIER_STYLES[data.tier];
  const isHero = variant === 'hero';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025]',
        isHero ? 'p-7 sm:p-9' : 'p-6 sm:p-7',
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -top-24 -right-20 size-[280px] rounded-full opacity-25 blur-[80px]',
          isHero && 'size-[360px] opacity-35',
        )}
        style={{
          background: `radial-gradient(circle, ${tierStyle.gradient.includes('amber') ? '#f59e0b' : tierStyle.gradient.includes('purple') ? '#a855f7' : tierStyle.gradient.includes('emerald') ? '#10b981' : '#64748b'}, transparent 70%)`,
        }}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              {hideTierNames ? 'Tus puntos' : 'Tu estado'}
            </p>
            {!hideTierNames && (
              <>
                <h2
                  className={cn(
                    'mt-2 font-display font-bold tracking-[-0.025em]',
                    isHero
                      ? 'text-3xl sm:text-[40px] leading-[1.05]'
                      : 'text-2xl sm:text-[28px] leading-tight',
                  )}
                >
                  {tierStyle.label}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tierStyle.description}
                </p>
              </>
            )}
          </div>
          {!hideTierNames && <TierBadge tier={data.tier} />}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex items-baseline gap-1.5">
            <Sparkles className="size-4 text-primary" />
            <span className="font-display text-2xl font-bold tabular-nums tracking-tight">
              {data.totalPoints.toLocaleString('es-MX')}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
              NPP
            </span>
          </div>
          <StreakBadge streak={data.streak} />
        </div>

        <div className="mt-5">
          <PointsProgress
            yearPoints={data.yearPoints}
            nextTier={data.nextTier}
            pointsToNext={data.pointsToNext}
            hideTierName={hideTierNames}
          />
        </div>

        {!isHero ? (
          <Link
            href={paths.recompensas}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Ver detalles <ArrowRight className="size-3.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
