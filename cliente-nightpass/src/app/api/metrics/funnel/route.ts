import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

// Solo ADMIN (el backend valida el rol). Devuelve el embudo de conversión.
export async function GET(req: NextRequest) {
  return proxyToApi(req, '/metrics/funnel', { method: 'GET' });
}
