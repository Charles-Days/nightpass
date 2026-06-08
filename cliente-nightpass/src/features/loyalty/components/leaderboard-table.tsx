'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/core/lib/utils/cn';
import { useLeaderboard } from '../hooks/use-leaderboard';

interface LeaderboardTableProps {
  city: string | null;
  currentUserId?: string | null;
}

export function LeaderboardTable({ city, currentUserId }: LeaderboardTableProps) {
  const { data, isLoading, isError } = useLeaderboard(city);

  if (!city) {
    return (
      <div className="rounded-[22px] border border-white/14 bg-white/[0.05] p-7 text-center text-sm text-white/55">
        Activa tu ciudad para ver el ranking.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-[22px] border border-white/14 bg-white/[0.05] p-6">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando ranking…
        </p>
      </div>
    );
  }

  if (isError || !data || data.length === 0) {
    return (
      <div className="rounded-[22px] border border-white/14 bg-white/[0.05] p-7 text-center">
        <p className="text-sm text-white/65">
          Aún no hay suficiente gente activa en {city}.
        </p>
        <p className="mt-1 text-[11px] text-white/40">
          Vuelve cuando más gente esté activa por aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-white/14 bg-white/[0.05]">
      <table className="w-full text-sm">
        <thead className="border-b border-white/12 bg-white/[0.035] text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
          <tr>
            <th className="px-4 py-3 sm:px-5">#</th>
            <th className="px-2 py-3">Usuario</th>
            <th className="px-4 py-3 sm:px-5 text-right">NPP año</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const isMe = currentUserId && row.userId === currentUserId;
            return (
              <tr
                key={row.userId}
                className={cn(
                  'border-b border-white/10 last:border-b-0 transition',
                  isMe
                    ? 'bg-primary/[0.08] hover:bg-primary/[0.12]'
                    : 'hover:bg-white/[0.07]',
                )}
              >
                <td className="px-4 py-3 sm:px-5 font-mono text-[12px] tabular-nums text-white/55">
                  {row.rank.toString().padStart(2, '0')}
                </td>
                <td className="px-2 py-3 font-semibold">
                  {row.name?.trim() || 'Sin nombre'}
                  {isMe ? (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                      Tú
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 sm:px-5 text-right font-mono tabular-nums">
                  {row.yearPoints.toLocaleString('es-MX')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
