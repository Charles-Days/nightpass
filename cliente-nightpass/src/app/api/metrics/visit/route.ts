import { createHash } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/core/config/env';

const VID_COOKIE = 'np_vid';
const ONE_YEAR = 60 * 60 * 24 * 365;

// Beacon de visita. Calcula el visitorId first-party (cookie np_vid) y, si no
// existe (incógnito / primera visita), lo deriva de hash(IP + User-Agent) —
// estable por dispositivo. Reenvía solo el id al backend; el HyperLogLog
// deduplica, así que recargar no recuenta.
export async function POST(req: NextRequest) {
  const existing = req.cookies.get(VID_COOKIE)?.value;
  let visitorId = existing;

  if (!visitorId) {
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
    const ua = req.headers.get('user-agent') ?? '';
    visitorId = createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 32);
  }

  try {
    await fetch(`${serverEnv.API_URL}/api/v1/metrics/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId }),
    });
  } catch {
    /* fire-and-forget: si el backend/Redis parpadea no rompemos la página */
  }

  const res = new NextResponse(null, { status: 204 });
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
