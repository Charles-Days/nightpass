import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

interface RouteContext {
  params: Promise<{
    path: string[];
  }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return proxyToApi(req, `/rp/${path.join('/')}${req.nextUrl.search}`, { method: 'GET' });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return proxyToApi(req, `/rp/${path.join('/')}`, { method: 'POST' });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return proxyToApi(req, `/rp/${path.join('/')}`, { method: 'PATCH' });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return proxyToApi(req, `/rp/${path.join('/')}`, { method: 'DELETE' });
}
