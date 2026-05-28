// Helpers para horarios de venues. Formato: { mon: "20:00-04:00" | "closed", ... }

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const DAY_LABELS: Record<string, string> = {
  mon: 'Lun', monday: 'Lun',
  tue: 'Mar', tuesday: 'Mar',
  wed: 'Mié', wednesday: 'Mié',
  thu: 'Jue', thursday: 'Jue',
  fri: 'Vie', friday: 'Vie',
  sat: 'Sáb', saturday: 'Sáb',
  sun: 'Dom', sunday: 'Dom',
};

function parseHHMM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function normalizeDayValue(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null;
  if (Array.isArray(v)) {
    const joined = v.map((x) => String(x)).filter(Boolean).join(' · ');
    return joined || null;
  }
  if (v && typeof v === 'object') {
    const obj = v as { open?: unknown; close?: unknown; closed?: unknown };
    if (obj.closed === true) return 'closed';
    const open = typeof obj.open === 'string' ? obj.open : null;
    const close = typeof obj.close === 'string' ? obj.close : null;
    if (open && close) return `${open}-${close}`;
    return null;
  }
  return null;
}

function findHoursForDay(raw: Record<string, unknown> | null, dayIdx: number): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const targetKey = DAY_KEYS[dayIdx];
  for (const [k, v] of Object.entries(raw)) {
    const norm = k.toLowerCase().slice(0, 3);
    if (norm === targetKey) return normalizeDayValue(v);
  }
  return null;
}

export interface OpenStatus {
  open: boolean;
  closesAt?: string;
  opensAt?: string;
  raw?: string;
}

export function computeOpenStatus(raw: Record<string, unknown> | null | undefined, now = new Date()): OpenStatus {
  if (!raw) return { open: false };
  const dayIdx = now.getDay();
  const prevDayIdx = (dayIdx + 6) % 7;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const prevHours = findHoursForDay(raw, prevDayIdx);
  if (prevHours && prevHours.toLowerCase() !== 'closed') {
    const m = /^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$/.exec(prevHours);
    if (m) {
      const open = parseHHMM(m[1]);
      const close = parseHHMM(m[2]);
      if (open != null && close != null && close < open) {
        if (nowMin < close) return { open: true, closesAt: m[2], raw: prevHours };
      }
    }
  }

  const todayHours = findHoursForDay(raw, dayIdx);
  if (!todayHours || todayHours.toLowerCase() === 'closed') {
    for (let offset = 1; offset <= 7; offset++) {
      const nextIdx = (dayIdx + offset) % 7;
      const nextHours = findHoursForDay(raw, nextIdx);
      if (nextHours && nextHours.toLowerCase() !== 'closed') {
        const m = /^(\d{1,2}:\d{2})/.exec(nextHours);
        return {
          open: false,
          opensAt: m ? `${DAY_LABELS[DAY_KEYS[nextIdx]] ?? ''} ${m[1]}` : undefined,
        };
      }
    }
    return { open: false };
  }

  const m = /^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$/.exec(todayHours);
  if (!m) return { open: false, raw: todayHours };
  const open = parseHHMM(m[1]);
  const close = parseHHMM(m[2]);
  if (open == null || close == null) return { open: false };

  if (close < open) {
    if (nowMin >= open) return { open: true, closesAt: m[2], raw: todayHours };
  } else if (nowMin >= open && nowMin < close) {
    return { open: true, closesAt: m[2], raw: todayHours };
  }
  return { open: false, opensAt: m[1] };
}

export function formatOpenHours(raw: Record<string, unknown> | null | undefined): Array<{ day: string; hours: string }> {
  if (!raw || typeof raw !== 'object') return [];
  return Object.entries(raw)
    .map(([k, v]) => {
      const norm = normalizeDayValue(v);
      const hours = !norm
        ? ''
        : norm.toLowerCase() === 'closed'
          ? 'Cerrado'
          : norm;
      return {
        day: DAY_LABELS[k.toLowerCase()] ?? k,
        hours,
      };
    })
    .filter((entry) => entry.hours.length > 0);
}
