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
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const resolvedUrl = res.url;
    let lat: number | undefined;
    let lng: number | undefined;
    try {
      const body = await res.text();
      // Google's APP_INITIALIZATION_STATE meta includes precise POI as [lng,lat,?]
      const meta = /\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/.exec(body);
      if (meta) {
        const cLat = Number(meta[1]);
        const cLng = Number(meta[2]);
        if (isFinite(cLat) && isFinite(cLng) && Math.abs(cLat) <= 90 && Math.abs(cLng) <= 180) {
          lat = cLat;
          lng = cLng;
        }
      }
      if (lat === undefined) {
        const data = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(body);
        if (data) {
          const cLat = Number(data[1]);
          const cLng = Number(data[2]);
          if (isFinite(cLat) && isFinite(cLng)) {
            lat = cLat;
            lng = cLng;
          }
        }
      }
    } catch {
      // body read failed; fall back to URL-only response
    }
    return NextResponse.json({ resolvedUrl, lat, lng });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'No se pudo resolver el link' },
      { status: 502 },
    );
  }
}
