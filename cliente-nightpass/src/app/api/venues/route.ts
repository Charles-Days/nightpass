import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function GET(req: NextRequest) {
  const search = req.nextUrl.search;
  return proxyToApi(req, `/venues${search}`, { method: 'GET' });
}
