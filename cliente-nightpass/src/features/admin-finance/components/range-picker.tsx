'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Preset {
  key: string;
  label: string;
  days: number;
}

const PRESETS: Preset[] = [
  { key: '1', label: 'Hoy', days: 1 },
  { key: '7', label: '7 días', days: 7 },
  { key: '30', label: '30 días', days: 30 },
  { key: '90', label: '90 días', days: 90 },
];

/** Calcula el rango [from, to] para una cantidad de días terminando hoy. */
function rangeForDays(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Deriva qué preset está activo a partir del span actual (en días). */
function activeKeyFromSpan(from?: string, to?: string): string {
  if (!from || !to) return '30';
  const ms = new Date(to).getTime() - new Date(from).getTime();
  const days = Math.round(ms / 86_400_000) + 1;
  const match = PRESETS.find((p) => p.days === days);
  return match?.key ?? '30';
}

export function RangePicker({ from, to }: { from?: string; to?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = React.useState(false);
  const activeKey = activeKeyFromSpan(from, to);

  function select(preset: Preset) {
    if (preset.key === activeKey) return;
    const range = rangeForDays(preset.days);
    const params = new URLSearchParams();
    params.set('from', range.from);
    params.set('to', range.to);
    setPending(true);
    router.push(`${pathname}?${params.toString()}`);
    // pending se limpia al re-renderizar con los nuevos searchParams.
  }

  React.useEffect(() => {
    setPending(false);
  }, [from, to]);

  return (
    <div className="flex items-center gap-1 self-start rounded-xl border border-white/8 bg-white/5 p-1">
      {PRESETS.map((preset) => {
        const isActive = preset.key === activeKey;
        return (
          <button
            key={preset.key}
            type="button"
            onClick={() => select(preset)}
            disabled={pending}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all disabled:opacity-60 ${
              isActive
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}
