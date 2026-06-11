import { createHash } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/core/config/env';

const VID_COOKIE = 'np_vid';
const ONE_YEAR = 60 * 60 * 24 * 365;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "Voy a ir" anónimo a un evento (sin cuenta). Calcula el mismo visitorId
// first-party que usa el tracking de visitas (cookie np_vid o hash IP+UA) y lo
// reenvía al backend, que dedup por SET en Redis: tocar dos veces no recuenta.
// Devuelve { count } con el total actualizado para que el front lo pinte.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'invalid_event' }, { status: 400 });
  }

  const existing = req.cookies.get(VID_COOKIE)?.value;
  let visitorId = existing;
  if (!visitorId) {
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
    const ua = req.headers.get('user-agent') ?? '';
    visitorId = createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 32);
  }

  let count = 0;
  try {
    const r = await fetch(`${serverEnv.API_URL}/api/v1/metrics/event-going`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: id, visitorId }),
    });
    if (r.ok) {
      const data = (await r.json()) as { count?: number };
      count = data.count ?? 0;
    }
  } catch {
    /* fire-and-forget: si el backend/Redis parpadea no rompemos la UI */
  }

  const res = NextResponse.json({ count });
  if (!existing) {
    res.cookies.set(VID_COOKIE, visitorId, {
      maxAge: ONE_YEAR,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }
  return res;
}
