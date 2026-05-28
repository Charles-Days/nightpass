import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function GET(req: NextRequest) {
  return proxyToApi(req, '/promoters/me/staff', { method: 'GET' });
}

export async function POST(req: NextRequest) {
  return proxyToApi(req, '/promoters/me/staff', { method: 'POST' });
}
