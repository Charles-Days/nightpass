import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

interface RouteContext {
  params: Promise<{ path?: string[] }>;
}

function buildPath(path?: string[]): string {
  return path && path.length > 0 ? `/${path.join('/')}` : '';
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return proxyToApi(
    req,
    `/physical-payments${buildPath(path)}${req.nextUrl.search}`,
    { method: 'GET' },
  );
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return proxyToApi(req, `/physical-payments${buildPath(path)}`, {
    method: 'POST',
  });
}
