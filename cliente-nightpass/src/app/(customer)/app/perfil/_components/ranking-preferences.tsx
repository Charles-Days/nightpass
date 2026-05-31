'use client';

import * as React from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { MEXICO_GEO } from '@/core/data/mexico-geo';
import { cn } from '@/core/lib/utils/cn';
import { useUpdateLocation } from '@/features/loyalty';

interface RankingPreferencesProps {
  initialState?: string | null;
  initialCity?: string | null;
  initialRankingOptIn?: boolean | null;
}

const SELECT_CLASS =
  'w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-primary/60 focus:bg-white/[0.05] disabled:opacity-50';

export function RankingPreferences({
  initialState,
  initialCity,
  initialRankingOptIn,
}: RankingPreferencesProps) {
  const [optIn, setOptIn] = React.useState(initialRankingOptIn === true);
  const [city, setCity] = React.useState<string | null>(initialCity ?? null);
  const [stateName, setStateName] = React.useState<string | null>(
    initialState ?? null,
  );

  const [editingCity, setEditingCity] = React.useState(false);
  const [estado, setEstado] = React.useState(initialState ?? '');
  const [ciudad, setCiudad] = React.useState(initialCity ?? '');

  const { mutate, isPending } = useUpdateLocation();

  const ciudades = React.useMemo(
    () => MEXICO_GEO.find((e) => e.estado === estado)?.ciudades ?? [],
    [estado],
  );

  const toggleOptIn = () => {
    const next = !optIn;
    if (next && !city) {
      toast.error('Primero elige tu ciudad');
      setEditingCity(true);
      return;
    }
    setOptIn(next);
    mutate(
      { rankingOptIn: next },
      {
        onSuccess: () =>
          toast.success(
            next ? 'Ya apareces en el ranking' : 'Ya no apareces en el ranking',
          ),
        onError: () => {
          setOptIn(!next);
          toast.error('No se pudo guardar');
        },
      },
    );
  };

  const saveCity = () => {
    if (!estado || !ciudad) {
      toast.error('Elige estado y ciudad');
      return;
    }
    mutate(
      { state: estado, city: ciudad },
      {
        onSuccess: () => {
          setCity(ciudad);
          setStateName(estado);
          setEditingCity(false);
          toast.success('Ciudad actualizada');
        },
        onError: () => toast.error('No se pudo guardar'),
      },
    );
  };

  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.025] p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Aparecer en el ranking</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tu nombre sale anonimizado (ej. “Carlos D.”) en el ranking de tu
            ciudad. Puedes desactivarlo cuando quieras.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={optIn}
          onClick={toggleOptIn}
          disabled={isPending}
          className={cn(
            'relative mt-1 h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50',
            optIn ? 'bg-primary' : 'bg-white/15',
          )}
        >
          <span
            className={cn(
              'absolute top-1 size-5 rounded-full bg-white transition-all',
              optIn ? 'left-6' : 'left-1',
            )}
          />
        </button>
      </div>

      <div className="mt-5 border-t border-white/8 pt-4">
        {editingCity ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
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
            <div className="flex gap-3">
              <button
                type="button"
                onClick={saveCity}
                disabled={isPending || !estado || !ciudad}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-4 py-2 text-sm font-semibold text-white transition active:scale-95 hover:brightness-110 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Guardar
              </button>
              <button
                type="button"
                onClick={() => {
                  setEstado(stateName ?? '');
                  setCiudad(city ?? '');
                  setEditingCity(false);
                }}
                disabled={isPending}
                className="rounded-full px-4 py-2 text-sm font-medium text-white/55 transition hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-1.5 text-sm text-white/70">
              <MapPin className="size-4 text-primary" />
              {city ? `${city}${stateName ? `, ${stateName}` : ''}` : 'Sin ciudad'}
            </p>
            <button
              type="button"
              onClick={() => setEditingCity(true)}
              className="text-xs font-medium text-white/55 transition hover:text-white"
            >
              {city ? 'Cambiar' : 'Elegir ciudad'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
