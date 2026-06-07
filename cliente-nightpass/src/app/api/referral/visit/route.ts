import { createHash } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/core/config/env';

const VID_COOKIE = 'np_vid';
const ONE_YEAR = 60 * 60 * 24 * 365;

// Registra que alguien abrió un link de invitación. Resuelve el visitorId
// first-party (cookie np_vid, o hash IP+UA) igual que el beacon de métricas, y
// se lo pasa al backend para que deduplique por visitante. Fire-and-forget.
export async function POST(req: NextRequest) {
  const existing = req.cookies.get(VID_COOKIE)?.value;
  let visitorId = existing;

  if (!visitorId) {
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
    const ua = req.headers.get('user-agent') ?? '';
    visitorId = createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 32);
  }

  let body: { code?: string; eventId?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* sin body válido → no registramos */
  }

  if (body.code) {
    try {
      await fetch(`${serverEnv.API_URL}/api/v1/referral/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: body.code, visitorId, eventId: body.eventId }),
      });
    } catch {
      /* fire-and-forget */
    }
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
