import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/core/config/env';
import { proxyToApi } from '@/core/lib/api/proxy';

// POST publico: NO anade Bearer (la solicitud llega de un visitante sin sesion).
export async function POST(req: NextRequest) {
  const body = await req.text();
  const upstream = await fetch(`${serverEnv.API_URL}/api/v1/promoter-applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  const text = await upstream.text();
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}

// GET admin: pasa por proxyToApi (usa cookie de acceso).
export async function GET(req: NextRequest) {
  const search = req.nextUrl.search;
  return proxyToApi(req, `/promoter-applications${search}`, { method: 'GET' });
}
