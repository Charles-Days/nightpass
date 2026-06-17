'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from 'lucide-react';

/**
 * Selector de fecha (y hora) con el lenguaje visual de NightPass. Reemplaza el
 * `<input type="datetime-local">` / `type="date"` nativo (que abre el picker del
 * SO, sin tema y casi invisible en dark).
 *
 * Drop-in: emite el MISMO string que el input nativo —
 *   mode="datetime" → "YYYY-MM-DDTHH:mm"
 *   mode="date"     → "YYYY-MM-DD"
 * — así los consumidores que hacían `new Date(value)` no cambian.
 *
 * El popover se renderiza en un portal a `document.body` con posición fija
 * calculada del trigger (se voltea hacia arriba si no hay espacio abajo), para
 * que nunca quede recortado dentro de un Dialog/Sheet.
 */

const pad2 = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']; // lunes primero
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function toDateTimeStr(d: Date) {
  return `${toDateStr(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Parsea el value (local, sin TZ) a Date o null. Acepta date y datetime. */
function parseValue(value: string): Date | null {
  if (!value) return null;
  const m = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/,
  );
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  return new Date(
    Number(y), Number(mo) - 1, Number(d),
    h ? Number(h) : 0, mi ? Number(mi) : 0,
  );
}

/** Índice 0-6 con lunes=0 para el día de la semana. */
function mondayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  mode?: 'date' | 'datetime';
  placeholder?: string;
  disabled?: boolean;
  /** Permite limpiar el campo (botón). Default true. */
  clearable?: boolean;
  className?: string;
}

export function DateTimeField({
  value,
  onChange,
  mode = 'datetime',
  placeholder = 'Selecciona una fecha',
  disabled,
  clearable = true,
  className,
}: Props) {
  const selected = parseValue(value);
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [view, setView] = React.useState<Date>(
    () => selected ?? new Date(),
  );
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const popRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  // Al abrir, sincroniza el mes visible con el valor y mide el trigger.
  const openPicker = () => {
    if (disabled) return;
    setView(selected ?? new Date());
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    setOpen(true);
  };

  // Cerrar con click-fuera / Escape, y recalcular en scroll/resize.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (
        popRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    const reposition = () => {
      if (triggerRef.current)
        setRect(triggerRef.current.getBoundingClientRect());
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  // Emite manteniendo la hora actual (o 00:00 si aún no había) en datetime.
  const pickDay = (day: Date) => {
    const next = new Date(day);
    if (mode === 'datetime') {
      next.setHours(selected?.getHours() ?? 0, selected?.getMinutes() ?? 0, 0, 0);
      onChange(toDateTimeStr(next));
    } else {
      onChange(toDateStr(next));
      setOpen(false);
    }
  };

  const setTime = (h: number, mi: number) => {
    const base = selected ?? new Date(view.getFullYear(), view.getMonth(), view.getDate());
    const next = new Date(base);
    next.setHours(h, mi, 0, 0);
    onChange(toDateTimeStr(next));
  };

  const label = selected
    ? selected.toLocaleString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...(mode === 'datetime'
          ? { hour: '2-digit', minute: '2-digit' }
          : {}),
      })
    : '';

  // ── Grilla del mes (6 semanas) ──────────────────────────────────────────
  const firstOfMonth = new Date(view.getFullYear(), view.getMonth(), 1);
  const startOffset = mondayIndex(firstOfMonth);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(1 - startOffset);
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
  const today = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // ── Posición del popover (flip arriba si no cabe abajo) ──────────────────
  const POP_W = 288;
  const POP_H = mode === 'datetime' ? 380 : 320;
  let top = 0;
  let left = 0;
  if (rect) {
    const below = rect.bottom + 8;
    const flipUp = below + POP_H > window.innerHeight && rect.top - 8 - POP_H > 0;
    top = flipUp ? rect.top - 8 - POP_H : below;
    left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - POP_W - 8,
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        disabled={disabled}
        className={
          className ??
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[open=true]:border-primary/60'
        }
        data-open={open}
      >
        <span className={label ? 'text-foreground' : 'text-muted-foreground'}>
          {label || placeholder}
        </span>
        <span className="flex items-center gap-1.5">
          {label && clearable && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Limpiar fecha"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="grid size-5 place-items-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            >
              <X className="size-3.5" />
            </span>
          )}
          <CalendarIcon className="size-4 shrink-0 text-primary" />
        </span>
      </button>

      {mounted &&
        open &&
        rect &&
        createPortal(
          <div
            ref={popRef}
            style={{ position: 'fixed', top, left, width: POP_W }}
            className="z-[120] overflow-hidden rounded-2xl border border-white/12 bg-[#0c0c12]/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl"
          >
            {/* Header mes */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
                }
                className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
              <p className="text-sm font-semibold capitalize text-white">
                {MONTHS[view.getMonth()]} {view.getFullYear()}
              </p>
              <button
                type="button"
                onClick={() =>
                  setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
                }
                className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Días de la semana */}
            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((d) => (
                <span
                  key={d}
                  className="grid h-7 place-items-center text-[11px] font-medium text-muted-foreground"
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Grilla */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((d, i) => {
                const inMonth = d.getMonth() === view.getMonth();
                const isSel = selected && sameDay(d, selected);
                const isToday = sameDay(d, today);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pickDay(d)}
                    className={[
                      'grid h-8 place-items-center rounded-lg text-[13px] transition',
                      isSel
                        ? 'bg-gradient-to-br from-[#9333ea] to-[#a855f7] font-semibold text-white'
                        : inMonth
                          ? 'text-white/85 hover:bg-white/10'
                          : 'text-white/25 hover:bg-white/5',
                      !isSel && isToday ? 'ring-1 ring-primary/50' : '',
                    ].join(' ')}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Hora (solo datetime) */}
            {mode === 'datetime' && (
              <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
                <Clock className="size-4 shrink-0 text-primary" />
                <select
                  value={selected ? selected.getHours() : 20}
                  onChange={(e) =>
                    setTime(Number(e.target.value), selected?.getMinutes() ?? 0)
                  }
                  className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h} className="bg-[#0c0c12]">
                      {pad2(h)}
                    </option>
                  ))}
                </select>
                <span className="text-muted-foreground">:</span>
                <select
                  value={selected ? selected.getMinutes() : 0}
                  onChange={(e) =>
                    setTime(selected?.getHours() ?? 20, Number(e.target.value))
                  }
                  className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
                >
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((mi) => (
                    <option key={mi} value={mi} className="bg-[#0c0c12]">
                      {pad2(mi)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
              <button
                type="button"
                onClick={() => pickDay(new Date())}
                className="text-[12px] font-medium text-primary transition hover:text-primary/80"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-white/10 px-3 py-1 text-[12px] font-medium text-white transition hover:bg-white/15"
              >
                Listo
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
