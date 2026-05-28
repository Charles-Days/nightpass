import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function GET(req: NextRequest) {
  return proxyToApi(req, `/stories/mine${req.nextUrl.search}`, { method: 'GET' });
}
