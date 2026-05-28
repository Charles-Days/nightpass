import * as React from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/core/components/ui/card';
import { cn } from '@/core/lib/utils/cn';

export type StatTrend = 'up' | 'down' | 'neutral';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  href?: string;
  hint?: string;
  trend?: StatTrend;
}

const TREND_ICON: Record<StatTrend, LucideIcon> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  neutral: Minus,
};

const TREND_COLOR: Record<StatTrend, string> = {
  up: 'text-emerald-300',
  down: 'text-rose-300',
  neutral: 'text-muted-foreground',
};

export function StatCard({ label, value, icon: Icon, href, hint, trend }: StatCardProps) {
  const TrendIcon = trend ? TREND_ICON[trend] : null;
  const inner = (
    <Card
      className={cn(
        'rounded-[22px] border border-white/10 bg-white/[0.025] transition-colors',
        href ? 'hover:bg-white/[0.04]' : null,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        {Icon ? <Icon className="size-4 text-primary/60" /> : null}
      </CardHeader>
      <CardContent>
        <p className="bg-gradient-to-br from-white to-purple-200 bg-clip-text font-display text-3xl font-bold text-transparent">
          {value}
        </p>
        {hint || TrendIcon ? (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {TrendIcon ? (
              <TrendIcon className={cn('size-3', trend ? TREND_COLOR[trend] : '')} />
            ) : null}
            {hint ? (
              <span className={cn('text-muted-foreground', trend ? TREND_COLOR[trend] : '')}>
                {hint}
              </span>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
