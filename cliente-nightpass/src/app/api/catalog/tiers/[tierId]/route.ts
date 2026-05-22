import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tierId: string }> },
) {
  const { tierId } = await params;
  return proxyToApi(req, `/catalog/tiers/${tierId}`, { method: 'GET' });
}
