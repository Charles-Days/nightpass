import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tierId: string }> },
) {
  const { id, tierId } = await params;
  return proxyToApi(req, `/events/${id}/tiers/${tierId}`, { method: 'PATCH' });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tierId: string }> },
) {
  const { id, tierId } = await params;
  return proxyToApi(req, `/events/${id}/tiers/${tierId}`, { method: 'DELETE' });
}
