'use client';

interface PasswordStrengthProps {
  value: string;
}

function score(value: string): number {
  if (!value) return 0;
  let s = 0;
  if (value.length >= 8) s += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) s += 1;
  if (/\d/.test(value)) s += 1;
  if (/[^A-Za-z0-9]/.test(value)) s += 1;
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
