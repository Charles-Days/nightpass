import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  const { id, eventId } = await params;
  const search = new URL(req.url).search;
  return proxyToApi(req, `/pases/venues/${id}/events/${eventId}${search}`, { method: 'GET' });
}
