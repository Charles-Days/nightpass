import { NextResponse } from 'next/server';

const ALLOWED_HOSTS = new Set([
  'maps.app.goo.gl',
  'goo.gl',
  'g.co',
  'maps.google.com',
  'www.google.com',
]);

const MAX_REDIRECTS = 5;

/**
 * ¿El host pertenece a Google? `goo.gl` es un acortador genérico: seguir sus
 * redirects con `redirect: 'follow'` permitiría apuntar a IPs internas
 * (169.254.169.254 metadata, servicios privados) → SSRF. Validamos CADA salto:
 * solo dominios Google, nunca literales IP.
 */
function hostAllowed(hostname: string): boolean {
  const h = hostname.toLowerCase();
  // Rechazar literales IP (IPv4/IPv6) — los dominios Google nunca lo son.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(':') || h === 'localhost') {
    return false;
  }
  if (ALLOWED_HOSTS.has(h)) return true;
  if (h === 'goo.gl' || h.endsWith('.goo.gl')) return true;
  if (h === 'g.co' || h.endsWith('.g.co')) return true;
  // google.com y ccTLDs (google.com.mx, google.es, …)
  return /(^|\.)google\.[a-z]{2,}(\.[a-z]{2})?$/.test(h);
}

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
    // Seguimos los redirects A MANO validando el host de cada salto (anti-SSRF).
    let current = parsed;
    let res: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!hostAllowed(current.hostname)) {
        return NextResponse.json({ error: 'Host no permitido' }, { status: 400 });
      }
      res = await fetch(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: { 'Accept-Language': 'en-US,en;q=0.9' },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) break;
        current = new URL(loc, current); // resuelve relativos
        continue;
      }
      break;
    }
    if (!res) {
      return NextResponse.json({ error: 'No se pudo resolver el link' }, { status: 502 });
    }
    const resolvedUrl = current.toString();
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
