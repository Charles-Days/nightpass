import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

// Solo ADMIN (el backend valida el rol). Devuelve visitantes únicos.
export async function GET(req: NextRequest) {
  return proxyToApi(req, '/metrics/visitors', { method: 'GET' });
}
