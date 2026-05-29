import { revalidateTag } from 'next/cache';
import { type NextRequest } from 'next/server';
import { proxyToApi } from '@/core/lib/api/proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToApi(req, `/events/${id}`, { method: 'GET' });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await proxyToApi(req, `/events/${id}`, { method: 'PATCH' });
  // Invalida el cache ISR del detalle público apenas el evento cambia
  // (publicar, editar portada/flyer, etc.) — no espera los 5 min de revalidate.
  if (res.ok) revalidateTag(`event:${id}`);
  return res;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await proxyToApi(req, `/events/${id}`, { method: 'DELETE' });
  if (res.ok) revalidateTag(`event:${id}`);
  return res;
}
