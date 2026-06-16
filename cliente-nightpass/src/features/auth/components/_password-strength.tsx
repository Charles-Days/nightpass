'use client';

import { PASSWORD_MIN_LENGTH } from '../schemas/password';

interface PasswordStrengthProps {
  value: string;
}

/** Puntúa contra las reglas reales del schema (`strongPassword`): largo + mayús + minús + número. */
function score(value: string): number {
  if (!value) return 0;
  let s = 0;
  if (value.length >= PASSWORD_MIN_LENGTH) s += 1;
  if (/[A-Z]/.test(value)) s += 1;
  if (/[a-z]/.test(value)) s += 1;
  if (/[0-9]/.test(value)) s += 1;
  return Math.min(s, 4);
}

const LABELS = ['', 'Débil', 'Media', 'Buena', 'Fuerte'];
const COLORS = [
  'bg-white/10',
  'bg-red-500',
  'bg-amber-400',
  'bg-emerald-400',
  'bg-emerald-400',
];
const TEXT_COLORS = [
  'text-white/35',
  'text-red-400',
  'text-amber-300',
  'text-emerald-300',
  'text-emerald-300',
];

export function PasswordStrength({ value }: PasswordStrengthProps) {
  const s = score(value);
  return (
    <div className="mt-2 flex items-center gap-1">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-[3px] flex-1 rounded-full transition ${i < s ? COLORS[s] : 'bg-white/8'}`}
        />
      ))}
      <span
        className={`ml-2 text-[10px] font-bold uppercase tracking-[0.1em] ${TEXT_COLORS[s]}`}
      >
        {LABELS[s]}
      </span>
    </div>
  );
}
