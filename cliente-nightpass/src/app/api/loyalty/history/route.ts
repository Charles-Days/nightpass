import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.search ? url.search : '';
  return proxyToApi(req, `/me/loyalty/history${search}`, { method: 'GET' });
}
