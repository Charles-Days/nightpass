'use client';

import Link from 'next/link';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { paths } from '@/core/config/paths';
import { cn } from '@/core/lib/utils/cn';
import { StreakBadge } from './streak-badge';
import { useLoyaltyStatus } from '../hooks/use-loyalty-status';

interface LoyaltyCardProps {
  variant?: 'compact' | 'hero';
  /** Conservado por compatibilidad con llamadas previas; ya no hay niveles. */
  hideTierNames?: boolean;
  className?: string;
}

export function LoyaltyCard({ variant = 'compact', className }: LoyaltyCardProps) {
  const { data, isLoading, isError } = useLoyaltyStatus();
  const isHero = variant === 'hero';

  if (isLoading) {
    return (
      <div
        className={cn(
          'rounded-[22px] border border-white/14 bg-white/[0.05] p-6',
          isHero && 'p-8',
          className,
        )}
      >
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando tus puntos…
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div
        className={cn(
          'rounded-[22px] border border-white/14 bg-white/[0.05] p-6',
          className,
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Tus puntos
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

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[22px] border border-white/14 bg-white/[0.05]',
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
        style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }}
      />

      <div className="relative">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Tus puntos
        </p>

        <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
          <div className="flex items-baseline gap-1.5">
            <Sparkles className={cn('text-primary', isHero ? 'size-5' : 'size-4')} />
            <span
              className={cn(
                'font-display font-bold tabular-nums tracking-[-0.02em]',
                isHero ? 'text-4xl sm:text-5xl' : 'text-3xl',
              )}
            >
              {data.totalPoints.toLocaleString('es-MX')}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
              NPP
            </span>
          </div>
          <StreakBadge streak={data.streak} />
        </div>

        {data.yearPoints > 0 && (
          <p className="mt-3 text-[12px] text-white/55">
            <span className="font-semibold text-white/75">
              {data.yearPoints.toLocaleString('es-MX')} NPP
            </span>{' '}
            ganados este año · cuentan para el ranking de tu ciudad.
          </p>
        )}

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
