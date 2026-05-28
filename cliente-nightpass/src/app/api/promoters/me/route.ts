import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function GET(req: NextRequest) {
  return proxyToApi(req, '/promoters/me', { method: 'GET' });
}

export async function PATCH(req: NextRequest) {
  return proxyToApi(req, '/promoters/me', { method: 'PATCH' });
}
