import { Building2, Megaphone, Award } from 'lucide-react';
import type {
  AdminFinanceVenueRow,
  AdminFinancePromoterRow,
  AdminFinanceRpRow,
} from '@/core/types/api';
import { money, intCount } from '../lib/format';

function RankBadge({ index }: { index: number }) {
  const medal = ['text-amber-300 bg-amber-500/15', 'text-slate-200 bg-white/10', 'text-orange-300 bg-orange-500/15'];
  const cls = medal[index] ?? 'text-muted-foreground bg-white/5';
  return (
    <span className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${cls}`}>
      {index + 1}
    </span>
  );
}

interface LeaderboardProps<T> {
  title: string;
  icon: React.ReactNode;
  rows: T[];
  empty: string;
  renderPrimary: (row: T) => React.ReactNode;
  renderSecondary?: (row: T) => React.ReactNode;
  renderAmount: (row: T) => string;
  keyOf: (row: T) => string;
}

function Leaderboard<T>({
  title,
  icon,
  rows,
  empty,
  renderPrimary,
  renderSecondary,
  renderAmount,
  keyOf,
}: LeaderboardProps<T>) {
  return (
    <div className="rounded-[24px] border border-white/14 bg-white/[0.05] p-5">
      <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
        <span className="text-purple-400">{icon}</span>
        <h3 className="font-display text-sm font-bold tracking-tight text-white">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-white/10">
          {rows.map((row, i) => (
            <li key={keyOf(row)} className="flex items-center gap-3 py-2.5">
              <RankBadge index={i} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{renderPrimary(row)}</p>
                {renderSecondary ? (
                  <p className="truncate text-[11px] text-muted-foreground">{renderSecondary(row)}</p>
                ) : null}
              </div>
              <span className="shrink-0 font-mono text-xs font-semibold text-[#10b981]">{renderAmount(row)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TopLists({
  topVenues,
  topPromoters,
  topRps,
}: {
  topVenues: AdminFinanceVenueRow[];
  topPromoters: AdminFinancePromoterRow[];
  topRps: AdminFinanceRpRow[];
}) {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Leaderboard<AdminFinanceVenueRow>
        title="Top Locales"
        icon={<Building2 className="size-4" />}
        rows={topVenues}
        empty="Sin datos de locales."
        keyOf={(r) => r.venueId}
        renderPrimary={(r) => r.name}
        renderSecondary={(r) => `${intCount(r.ordersCount)} órdenes`}
        renderAmount={(r) => money(r.grossCents)}
      />
      <Leaderboard<AdminFinancePromoterRow>
        title="Top Organizadores"
        icon={<Megaphone className="size-4" />}
        rows={topPromoters}
        empty="Sin datos de organizadores."
        keyOf={(r) => r.promoterId}
        renderPrimary={(r) => r.name}
        renderSecondary={(r) => `${intCount(r.ordersCount)} órdenes`}
        renderAmount={(r) => money(r.grossCents)}
      />
      <Leaderboard<AdminFinanceRpRow>
        title="Top RPs"
        icon={<Award className="size-4" />}
        rows={topRps}
        empty="Sin actividad de RPs."
        keyOf={(r) => r.rpId}
        renderPrimary={(r) => r.displayName}
        renderSecondary={(r) => `${r.rpCode} · ${intCount(r.salesCount)} ventas`}
        renderAmount={(r) => money(r.earningsCents)}
      />
    </section>
  );
}
