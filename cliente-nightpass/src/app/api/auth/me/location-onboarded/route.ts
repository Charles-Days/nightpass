import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function PATCH(req: NextRequest) {
  return proxyToApi(req, '/auth/me/location-onboarded', { method: 'PATCH' });
}
