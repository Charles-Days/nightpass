import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> },
) {
  const { id, orderId } = await params;
  return proxyToApi(req, `/events/${id}/orders/${orderId}/thank-you`, { method: 'POST' });
}
