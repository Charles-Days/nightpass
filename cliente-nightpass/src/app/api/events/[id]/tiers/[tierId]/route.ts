import { revalidateTag } from 'next/cache';
import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tierId: string }> },
) {
  const { id, tierId } = await params;
  const res = await proxyToApi(req, `/events/${id}/tiers/${tierId}`, { method: 'PATCH' });
  if (res.ok) revalidateTag(`event:${id}`);
  return res;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tierId: string }> },
) {
  const { id, tierId } = await params;
  const res = await proxyToApi(req, `/events/${id}/tiers/${tierId}`, { method: 'DELETE' });
  if (res.ok) revalidateTag(`event:${id}`);
  return res;
}
