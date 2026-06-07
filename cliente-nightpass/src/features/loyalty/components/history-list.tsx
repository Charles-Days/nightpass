'use client';

import {
  Flame,
  Gift,
  MapPin,
  Sparkles,
  Ticket,
  Trophy,
  Users,
  Wrench,
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/core/lib/utils/cn';
import type { LoyaltyEntry, LoyaltyEventType } from '@/core/types/api';
import { useLoyaltyHistory } from '../hooks/use-loyalty-history';

const TYPE_META: Record<
  LoyaltyEventType,
  { icon: typeof Ticket; label: (e: LoyaltyEntry) => string }
> = {
  EVENT_CHECKIN: {
    icon: Ticket,
    label: (e) =>
      e.eventTitle && e.venueName
        ? `Check-in en ${e.eventTitle} · ${e.venueName}`
        : e.eventTitle ?? e.venueName ?? 'Check-in de evento',
  },
  VENUE_CHECKIN: {
    icon: MapPin,
    label: (e) => `Check-in en ${e.venueName ?? 'un bar'}`,
  },
  FIRST_VENUE_BONUS: {
    icon: Sparkles,
    label: (e) =>
      e.venueName
        ? `Primera vez en ${e.venueName}`
        : 'Bonus por primer check-in',
  },
  STREAK_DAILY_BONUS: {
    icon: Flame,
    label: () => 'Bonus diario por racha',
  },
  STREAK_MILESTONE: {
    icon: Trophy,
    label: () => 'Hito de racha alcanzado',
  },
  BRING_FRIEND_BONUS: {
    icon: Users,
    label: () => 'Bonus por traer a un amigo',
  },
  REFERRAL_VISIT: {
    icon: Users,
    label: () => 'Alguien abrió tu link de invitación',
  },
  REFERRAL_SIGNUP: {
    icon: Users,
    label: () => 'Un invitado creó su cuenta',
  },
  REDEEM: {
    icon: Gift,
    label: () => 'Canje de recompensa',
  },
  ADMIN_ADJUST: {
    icon: Wrench,
    label: () => 'Ajuste manual',
  },
};

// Fallback defensivo: si el backend agrega un tipo nuevo, no rompemos el render.
const FALLBACK_META = {
  icon: Sparkles,
  label: () => 'Movimiento de puntos',
} as const;

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function HistoryList({ limit = 50 }: { limit?: number }) {
  const { data, isLoading, isError } = useLoyaltyHistory(limit);

  if (isLoading) {
    return (
      <div className="rounded-[22px] border border-white/14 bg-white/[0.05] p-6">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando actividad…
        </p>
      </div>
    );
  }

  if (isError || !data || data.length === 0) {
    return (
      <div className="rounded-[22px] border border-white/14 bg-white/[0.05] p-7 text-center">
        <p className="text-sm text-white/65">Aún no tienes movimientos.</p>
        <p className="mt-1 text-[11px] text-white/40">
          Tu primer check-in aparecerá aquí.
        </p>
      </div>
    );
  }

  // Más de 6 movimientos: fijar alto a ~6 filas y dejar scroll interno para no
  // pintar una lista infinita que empuje el resto de la página.
  const scrolls = data.length > 6;

  return (
    <ul
      className={cn(
        'overflow-hidden rounded-[22px] border border-white/14 bg-white/[0.05]',
        scrolls &&
          'max-h-[26rem] overflow-y-auto overscroll-contain [scrollbar-width:thin]',
      )}
    >
      {data.map((entry, i) => {
        const meta = TYPE_META[entry.type] ?? FALLBACK_META;
        const Icon = meta.icon;
        const positive = entry.points >= 0;
        return (
          <li
            key={entry.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3.5 sm:px-5',
              i > 0 && 'border-t border-white/10',
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary/12 text-primary">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {meta.label(entry)}
              </p>
              <p className="mt-0.5 text-[11px] text-white/45">
                {formatDate(entry.occurredAt)}
                {entry.multiplier && entry.multiplier !== 1 ? (
                  <span className="ml-1.5 text-primary/80">
                    × {entry.multiplier}
                  </span>
                ) : null}
              </p>
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums',
                positive
                  ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200'
                  : 'border-red-400/35 bg-red-500/15 text-red-200',
              )}
            >
              {positive ? '+' : ''}
              {entry.points} NPP
            </span>
          </li>
        );
      })}
    </ul>
  );
}
