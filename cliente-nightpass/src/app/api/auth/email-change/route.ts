import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function POST(req: NextRequest) {
  return proxyToApi(req, '/auth/me/email-change', { method: 'POST' });
}
