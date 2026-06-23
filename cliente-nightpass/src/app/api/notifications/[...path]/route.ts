import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

interface RouteContext {
  params: Promise<{
    path: string[];
  }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return proxyToApi(
    req,
    `/notifications/${path.join('/')}${req.nextUrl.search}`,
    { method: 'GET' },
  );
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  return proxyToApi(req, `/notifications/${path.join('/')}`, {
    method: 'POST',
  });
}
