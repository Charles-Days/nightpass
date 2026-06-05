'use client';

import * as React from 'react';
import { Check, Loader2, MapPin, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { MEXICO_GEO } from '@/core/data/mexico-geo';
import { cn } from '@/core/lib/utils/cn';
import { LeaderboardTable } from './leaderboard-table';
import { useUpdateLocation } from '../hooks/use-update-location';

interface CityRankingProps {
  initialState?: string | null;
  initialCity?: string | null;
  /** null = aún no decide → se le pregunta. true/false = ya decidió. */
  initialRankingOptIn?: boolean | null;
  currentUserId?: string | null;
}

const SELECT_CLASS =
  'w-full appearance-none rounded-xl border border-white/14 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition focus:border-primary/60 focus:bg-white/[0.08] disabled:opacity-50';

export function CityRanking({
  initialState,
  initialCity,
  initialRankingOptIn,
  currentUserId,
}: CityRankingProps) {
  const decided =
    initialRankingOptIn === true || initialRankingOptIn === false;

  const [city, setCity] = React.useState<string | null>(initialCity ?? null);
  const [optIn, setOptIn] = React.useState(initialRankingOptIn ?? true);
  const [editing, setEditing] = React.useState(!decided);

  const [estado, setEstado] = React.useState(initialState ?? '');
  const [ciudad, setCiudad] = React.useState(initialCity ?? '');
  const [wantsRanking, setWantsRanking] = React.useState(
    initialRankingOptIn ?? true,
  );

  const { mutate, isPending } = useUpdateLocation();

  const ciudades = React.useMemo(
    () => MEXICO_GEO.find((e) => e.estado === estado)?.ciudades ?? [],
    [estado],
  );

  const handleSave = () => {
    if (!estado || !ciudad) {
      toast.error('Elige tu estado y ciudad');
      return;
    }
    mutate(
      { state: estado, city: ciudad, rankingOptIn: wantsRanking },
      {
        onSuccess: () => {
          setCity(ciudad);
          setOptIn(wantsRanking);
          setEditing(false);
          toast.success(
            wantsRanking
              ? `Ya apareces en el ranking de ${ciudad}`
              : `Ciudad guardada. No aparecerás en el ranking`,
          );
        },
        onError: () => toast.error('No se pudo guardar'),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          <h2 className="font-display text-xl font-bold tracking-tight">
            Ranking de tu ciudad
          </h2>
        </div>
        {city && !editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-white/55 transition hover:text-white"
          >
            <MapPin className="size-3.5" />
            {city} · cambiar
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="rounded-[22px] border border-white/14 bg-white/[0.05] p-6 sm:p-7">
          <p className="text-sm text-white/65">
            Elige de qué ciudad eres para ver el ranking de Insiders. Lo
            guardamos en tu cuenta — solo te lo preguntamos una vez.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <select
              value={estado}
              onChange={(e) => {
                setEstado(e.target.value);
                setCiudad('');
              }}
              disabled={isPending}
              className={SELECT_CLASS}
            >
              <option value="">Estado…</option>
              {MEXICO_GEO.map((e) => (
                <option key={e.estado} value={e.estado} className="bg-[#0c0c12]">
                  {e.estado}
                </option>
              ))}
            </select>

            <select
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              disabled={isPending || !estado}
              className={SELECT_CLASS}
            >
              <option value="">Ciudad…</option>
              {ciudades.map((c) => (
                <option key={c} value={c} className="bg-[#0c0c12]">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setWantsRanking((v) => !v)}
            disabled={isPending}
            className="mt-4 flex w-full items-start gap-3 rounded-xl border border-white/14 bg-white/[0.035] p-4 text-left transition hover:bg-white/[0.07]"
          >
            <span
              className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition',
                wantsRanking
                  ? 'border-primary bg-primary text-white'
                  : 'border-white/22 bg-transparent',
              )}
            >
              {wantsRanking ? <Check className="size-3.5" /> : null}
            </span>
            <span>
              <span className="block text-sm font-medium text-white">
                Quiero aparecer en el ranking
              </span>
              <span className="mt-0.5 block text-xs text-white/50">
                Tu nombre saldrá anonimizado (ej. “Carlos D.”). Puedes cambiarlo
                cuando quieras desde tu perfil.
              </span>
            </span>
          </button>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || !estado || !ciudad}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-5 py-2.5 text-sm font-semibold text-white transition active:scale-95 hover:brightness-110',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Continuar
            </button>
            {decided ? (
              <button
                type="button"
                onClick={() => {
                  setEstado(initialState ?? '');
                  setCiudad(city ?? '');
                  setWantsRanking(optIn);
                  setEditing(false);
                }}
                disabled={isPending}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-white/55 transition hover:text-white"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          {!optIn ? (
            <p className="text-xs text-white/45">
              No apareces en el ranking. Actívalo desde tu perfil cuando quieras.
            </p>
          ) : null}
          <LeaderboardTable city={city} currentUserId={currentUserId} />
        </>
      )}
    </div>
  );
}
