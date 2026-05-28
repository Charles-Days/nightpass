import { NextResponse } from 'next/server';

const ALLOWED_HOSTS = new Set([
  'maps.app.goo.gl',
  'goo.gl',
  'g.co',
  'maps.google.com',
  'www.google.com',
]);

// Resuelve un short link de Google Maps siguiendo redirects y devuelve la URL
// final (que ya contiene las coords parseables por parseGoogleMapsUrl).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');
  if (!target) {
    return NextResponse.json({ error: 'Falta parámetro url' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: 'Host no permitido' }, { status: 400 });
  }

  try {
    const res = await fetch(parsed.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (NightPass admin maps resolver)' },
    });
    return NextResponse.json({ resolvedUrl: res.url });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'No se pudo resolver el link' },
      { status: 502 },
    );
  }
}
