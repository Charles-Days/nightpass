import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE } from '@/core/config/cookies';
import { serverEnv } from '@/core/config/env';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const search = new URL(req.url).search;
  const url = `${serverEnv.API_URL}/api/v1/pases/venues/${id}/export.csv${search}`;

  const upstream = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new NextResponse(text || null, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
      },
    });
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'text/csv; charset=utf-8',
      'Content-Disposition':
        upstream.headers.get('content-disposition') ?? 'attachment; filename="ventas.csv"',
    },
  });
}
