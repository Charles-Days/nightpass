import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function GET(req: NextRequest) {
  return proxyToApi(req, '/maintenance', { method: 'GET' });
}

export async function POST(req: NextRequest) {
  return proxyToApi(req, '/maintenance', { method: 'POST' });
}
