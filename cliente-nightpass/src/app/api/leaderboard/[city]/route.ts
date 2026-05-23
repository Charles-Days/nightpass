import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ city: string }> },
) {
  const { city } = await params;
  return proxyToApi(req, `/leaderboard/city/${encodeURIComponent(city)}`, {
    method: 'GET',
  });
}
