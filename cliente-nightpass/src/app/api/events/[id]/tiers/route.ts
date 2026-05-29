import { revalidateTag } from 'next/cache';
import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await proxyToApi(req, `/events/${id}/tiers`, { method: 'POST' });
  // Nuevo tier → invalida el detalle público para que aparezca al instante.
  if (res.ok) revalidateTag(`event:${id}`);
  return res;
}
