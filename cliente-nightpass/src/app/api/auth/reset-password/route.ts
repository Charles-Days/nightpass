import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/core/config/env';

export async function POST(req: NextRequest) {
  const body = await req.text();

  const upstream = await fetch(`${serverEnv.API_URL}/api/v1/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  const data = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    return NextResponse.json(data ?? { message: 'Error desconocido' }, { status: upstream.status });
  }

  return NextResponse.json({ ok: true });
}
