'use client';

import * as React from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/core/lib/utils/cn';

const WEEK_DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function parseValue(value: string | undefined): Date | null {
  if (!value) return null;
  const [datePart, timePart = '00:00'] = value.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
  return isNaN(date.getTime()) ? null : date;
}

function toValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDisplay(date: Date | null): string {
  if (!date) return '';
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${dd}/${mm}/${yyyy} · ${hh}:${min}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface DateTimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minuteStep?: number;
}

export function DateTimePicker({
  value,
  onChange,
  id,
  placeholder = 'Selecciona fecha y hora',
  disabled,
  className,
  minuteStep = 5,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const parsed = parseValue(value);
  const [viewYear, setViewYear] = React.useState(() => (parsed ?? new Date()).getFullYear());
  const [viewMonth, setViewMonth] = React.useState(() => (parsed ?? new Date()).getMonth());
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const today = new Date();
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startDay = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { date: Date; muted: boolean }[] = [];
  for (let i = startDay - 1; i >= 0; i--) {
    cells.push({
      date: new Date(viewYear, viewMonth - 1, daysInPrev - i),
      muted: true,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(viewYear, viewMonth, d), muted: false });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last);
    next.setDate(next.getDate() + 1);
    cells.push({ date: next, muted: next.getMonth() !== viewMonth });
    if (cells.length >= 42) break;
  }

  const selectDay = (date: Date) => {
    const base = parsed ?? new Date();
    const next = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      base.getHours(),
      base.getMinutes(),
    );
    onChange(toValue(next));
  };

  const changeTime = (h: number, m: number) => {
    const base = parsed ?? new Date();
    const next = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      h,
      m,
    );
    onChange(toValue(next));
  };

  const goMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  const goToday = () => {
    const now = new Date();
    setViewMonth(now.getMonth());
    setViewYear(now.getFullYear());
    const base = parsed ?? now;
    const next = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      base.getHours(),
      base.getMinutes(),
    );
    onChange(toValue(next));
  };

  const minuteOptions: number[] = [];
  for (let m = 0; m < 60; m += minuteStep) minuteOptions.push(m);
  const hourOptions: number[] = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-left text-sm',
          'outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          'hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-50',
          open && 'border-primary/60 ring-[3px] ring-primary/30',
        )}
      >
        <Calendar className="size-4 shrink-0 text-muted-foreground" />
        <span className={cn('flex-1', !parsed && 'text-muted-foreground')}>
          {parsed ? formatDisplay(parsed) : placeholder}
        </span>
      </button>

      {open && !disabled ? (
        <div
          className="absolute left-0 z-50 mt-2 w-[320px] rounded-[18px] border border-white/12 bg-[#0a0712] p-3 shadow-2xl shadow-black/50"
          role="dialog"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-1 pb-2">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="flex-1 text-center text-sm font-semibold">
              {MONTHS[viewMonth]} {viewYear}
            </p>
            <button
              type="button"
              onClick={() => goMonth(1)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Week days */}
          <div
            className="gap-1 px-1 pb-1"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            }}
          >
            {WEEK_DAYS.map((d, i) => (
              <div
                key={i}
                className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div
            className="gap-1 px-1"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            }}
          >
            {cells.map((cell, i) => {
              const isToday = isSameDay(cell.date, today);
              const isSelected = parsed && isSameDay(cell.date, parsed);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(cell.date)}
                  className={cn(
                    'flex h-8 w-full items-center justify-center rounded-md text-xs transition-colors',
                    cell.muted
                      ? 'text-muted-foreground/40 hover:bg-white/[0.04]'
                      : 'text-foreground hover:bg-white/[0.08]',
                    isToday && !isSelected && 'ring-1 ring-primary/40',
                    isSelected &&
                      'bg-gradient-to-br from-[#9333ea] to-[#a855f7] font-semibold text-white hover:from-[#7e22ce] hover:to-[#9333ea]',
                  )}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Time picker */}
          <div className="mt-3 flex items-center gap-2 border-t border-white/8 pt-3">
            <Clock className="size-4 text-muted-foreground" />
            <select
              value={parsed?.getHours() ?? 0}
              onChange={(e) =>
                changeTime(Number(e.target.value), parsed?.getMinutes() ?? 0)
              }
              className="h-8 rounded-md border border-white/12 bg-white/[0.04] px-2 text-xs outline-none focus-visible:border-primary/60"
            >
              {hourOptions.map((h) => (
                <option key={h} value={h}>
                  {pad(h)}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">:</span>
            <select
              value={parsed?.getMinutes() ?? 0}
              onChange={(e) =>
                changeTime(parsed?.getHours() ?? 0, Number(e.target.value))
              }
              className="h-8 rounded-md border border-white/12 bg-white/[0.04] px-2 text-xs outline-none focus-visible:border-primary/60"
            >
              {minuteOptions.map((m) => (
                <option key={m} value={m}>
                  {pad(m)}
                </option>
              ))}
            </select>
            <div className="ml-auto flex gap-1">
              <button
                type="button"
                onClick={goToday}
                className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
