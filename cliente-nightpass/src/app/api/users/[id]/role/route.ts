import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToApi(req, `/users/${id}/role`, { method: 'PATCH' });
}
