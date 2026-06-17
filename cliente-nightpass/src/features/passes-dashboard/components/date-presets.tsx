'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/core/lib/utils/cn';
import { DateTimeField } from '@/core/components/datetime-field';

type PresetId = 'hoy' | '7d' | '30d' | 'mes' | 'todo' | 'custom';

function toIsoDay(d: Date) {
  return d.toISOString();
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeRange(id: PresetId): { from?: string; to?: string } {
  const now = new Date();
  if (id === 'hoy') {
    return { from: toIsoDay(startOfToday()), to: toIsoDay(now) };
  }
  if (id === '7d') {
    const from = startOfToday();
    from.setDate(from.getDate() - 6);
    return { from: toIsoDay(from), to: toIsoDay(now) };
  }
  if (id === '30d') {
    const from = startOfToday();
    from.setDate(from.getDate() - 29);
    return { from: toIsoDay(from), to: toIsoDay(now) };
  }
  if (id === 'mes') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { from: toIsoDay(from), to: toIsoDay(now) };
  }
  return {};
}

function isoToInputDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function inputDateToIso(value: string, endOfDay = false): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return '';
  const d = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
  return d.toISOString();
}

const PRESETS: Array<{ id: Exclude<PresetId, 'custom'>; label: string }> = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: 'mes', label: 'Mes' },
  { id: 'todo', label: 'Todo' },
];

export function DatePresets() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const [showCustom, setShowCustom] = React.useState<boolean>(false);

  const activePreset: PresetId = React.useMemo(() => {
    if (!from && !to) return '30d';
    const candidates: Array<Exclude<PresetId, 'custom' | 'todo'>> = ['hoy', '7d', '30d', 'mes'];
    for (const id of candidates) {
      const range = computeRange(id);
      if (range.from && from && Math.abs(new Date(range.from).getTime() - new Date(from).getTime()) < 1000 * 60 * 5) {
        return id;
      }
    }
    return 'custom';
  }, [from, to]);

  const applyPreset = (id: Exclude<PresetId, 'custom'>) => {
    setShowCustom(false);
    const params = new URLSearchParams(searchParams.toString());
    const range = computeRange(id);
    if (range.from) params.set('from', range.from);
    else params.delete('from');
    if (range.to) params.set('to', range.to);
    else params.delete('to');
    const qs = params.toString();
    router.push(`?${qs}`, { scroll: false });
  };

  const applyCustom = (nextFrom: string, nextTo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextFrom) params.set('from', nextFrom);
    else params.delete('from');
    if (nextTo) params.set('to', nextTo);
    else params.delete('to');
    const qs = params.toString();
    router.push(`?${qs}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => {
        const active = activePreset === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.id)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95',
              active
                ? 'border border-primary/40 bg-primary/15 text-purple-100 hover:bg-primary/20'
                : 'border border-white/14 bg-white/[0.05] text-white/75 hover:border-white/22 hover:bg-white/[0.09]',
            )}
          >
            {p.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setShowCustom((v) => !v)}
        className={cn(
          'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95',
          activePreset === 'custom' || showCustom
            ? 'border border-primary/40 bg-primary/15 text-purple-100 hover:bg-primary/20'
            : 'border border-white/14 bg-white/[0.05] text-white/75 hover:border-white/22 hover:bg-white/[0.09]',
        )}
      >
        Personalizado
      </button>

      {showCustom ? (
        <div className="flex items-center gap-2">
          <div className="w-40">
            <DateTimeField
              mode="date"
              value={isoToInputDate(from)}
              onChange={(v) => applyCustom(inputDateToIso(v, false), to ?? '')}
              placeholder="Desde"
              clearable={false}
            />
          </div>
          <span className="text-xs text-muted-foreground">a</span>
          <div className="w-40">
            <DateTimeField
              mode="date"
              value={isoToInputDate(to)}
              onChange={(v) => applyCustom(from ?? '', inputDateToIso(v, true))}
              placeholder="Hasta"
              clearable={false}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
