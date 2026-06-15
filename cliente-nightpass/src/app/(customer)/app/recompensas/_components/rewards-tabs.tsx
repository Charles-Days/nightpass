'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CityRanking, HistoryList } from '@/features/loyalty';
import { RewardsSection } from '@/features/rewards';

interface Props {
  state?: string | null;
  city?: string | null;
  rankingOptIn?: boolean | null;
  userId: string;
}

const TABS = [
  { key: 'rewards', label: 'Recompensas' },
  { key: 'ranking', label: 'Ranking' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function isTabKey(v: string | null): v is TabKey {
  return v === 'rewards' || v === 'ranking';
}

/** Divide la zona en dos: canje/actividad (Recompensas) y el ranking de la ciudad.
 *  El tab activo se sincroniza con el search param `?tab=` para que los links funcionen. */
export function RewardsTabs({ state, city, rankingOptIn, userId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramTab = searchParams.get('tab');
  const tab: TabKey = isTabKey(paramTab) ? paramTab : 'rewards';

  const setTab = (next: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Secciones de recompensas"
        className="relative isolate grid grid-cols-2 rounded-full border border-white/10 bg-white/[0.05] p-1"
      >
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] shadow-[0_4px_16px_-4px_rgba(168,85,247,0.6)] transition-transform duration-300 ease-out will-change-transform"
          style={{ transform: tab === 'ranking' ? 'translateX(100%)' : 'translateX(0%)' }}
        />
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`relative z-10 rounded-full py-2.5 text-sm font-semibold transition-colors duration-200 ${
                active ? 'text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'rewards' ? (
        <div key="rewards" role="tabpanel" aria-label="Recompensas" className="np-fade-in mt-6 space-y-10">
          <RewardsSection />

          <div>
            <h2 className="mb-4 font-display text-xl font-bold tracking-tight">
              Actividad reciente
            </h2>
            <HistoryList limit={30} />
          </div>

          <div className="rounded-[22px] border border-white/14 bg-white/[0.05] p-6 sm:p-7">
            <h3 className="font-display text-lg font-bold tracking-tight">
              ¿Cómo gano puntos?
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/75 marker:text-primary">
              <li>Cuando el staff escanea tu pase al entrar a un evento.</li>
              <li>Al escanear el QR del bar (máximo una vez al día por bar).</li>
              <li>Un bonus la primera vez que visitas un bar.</li>
              <li>Por cada día consecutivo de racha. Hitos en 7, 30, 100 y 365 días.</li>
              <li>Cuando alguien abre tu link de invitación y crea su cuenta.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div key="ranking" role="tabpanel" aria-label="Ranking" className="np-fade-in mt-6">
          <CityRanking
            initialState={state}
            initialCity={city}
            initialRankingOptIn={rankingOptIn}
            currentUserId={userId}
          />
        </div>
      )}
    </div>
  );
}
