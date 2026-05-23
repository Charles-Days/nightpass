import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function DELETE(req: NextRequest) {
  return proxyToApi(req, '/me/locations', { method: 'DELETE' });
}
