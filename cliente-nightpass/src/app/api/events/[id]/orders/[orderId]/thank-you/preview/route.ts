import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> },
) {
  const { id, orderId } = await params;
  return proxyToApi(
    req,
    `/events/${id}/orders/${orderId}/thank-you/preview${req.nextUrl.search}`,
    { method: 'GET' },
  );
}
