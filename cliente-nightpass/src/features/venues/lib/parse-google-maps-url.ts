// Parsea distintos formatos de URL de Google Maps y devuelve { lat, lng }.
// Soporta:
//  - https://www.google.com/maps/place/.../@18.9244,-99.2210,17z/...
//  - https://www.google.com/maps?q=18.9244,-99.2210
//  - https://www.google.com/maps/dir/.../18.9244,-99.2210
//  - https://maps.app.goo.gl/...  (short link — no se puede parsear sin seguir redirect; devuelve null)
//  - "18.9244, -99.2210" texto crudo
export function parseGoogleMapsUrl(input: string): { lat: number; lng: number } | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Texto crudo "lat,lng"
  const rawCoords = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(trimmed);
  if (rawCoords) {
    const lat = Number(rawCoords[1]);
    const lng = Number(rawCoords[2]);
    if (isValidCoords(lat, lng)) return { lat, lng };
  }

  // @lat,lng,zoom (formato más confiable cuando aparece)
  const atForm = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,|\?|\/|$)/.exec(trimmed);
  if (atForm) {
    const lat = Number(atForm[1]);
    const lng = Number(atForm[2]);
    if (isValidCoords(lat, lng)) return { lat, lng };
  }

  // !3dLAT!4dLNG — coords del POI (Google las mete en el data param)
  const dForm = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(trimmed);
  if (dForm) {
    const lat = Number(dForm[1]);
    const lng = Number(dForm[2]);
    if (isValidCoords(lat, lng)) return { lat, lng };
  }

  // /maps/search/LAT,LNG o /maps/search/LAT,+LNG (resultado típico de short links)
  // También /maps/place/.../LAT,LNG y /maps/dir/.../LAT,LNG
  const pathForm =
    /\/maps\/(?:search|place|dir)\/(?:[^/]+\/)?(-?\d+(?:\.\d+)?),\s*\+?\s*(-?\d+(?:\.\d+)?)/.exec(
      trimmed,
    );
  if (pathForm) {
    const lat = Number(pathForm[1]);
    const lng = Number(pathForm[2]);
    if (isValidCoords(lat, lng)) return { lat, lng };
  }

  // ?q=lat,lng or &q=lat,lng or ?ll=lat,lng
  try {
    const url = new URL(trimmed);
    for (const key of ['q', 'll', 'destination', 'center']) {
      const v = url.searchParams.get(key);
      if (!v) continue;
      const m = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(v);
      if (m) {
        const lat = Number(m[1]);
        const lng = Number(m[2]);
        if (isValidCoords(lat, lng)) return { lat, lng };
      }
    }
  } catch {
    // no es URL válida; ignora
  }

  return null;
}

// Resuelve un short link de Maps (maps.app.goo.gl/...) vía el route handler
// del propio panel y luego parsea las coords del URL final.
export async function resolveAndParseGoogleMapsUrl(
  input: string,
): Promise<{ lat: number; lng: number } | null> {
  const direct = parseGoogleMapsUrl(input);
  if (direct) return direct;

  let host: string;
  try {
    host = new URL(input.trim()).hostname;
  } catch {
    return null;
  }
  if (
    !/^(maps\.app\.goo\.gl|goo\.gl|g\.co|maps\.google\.com|www\.google\.com)$/.test(
      host,
    )
  )
    return null;

  try {
    const res = await fetch(`/api/maps/resolve?url=${encodeURIComponent(input.trim())}`);
    if (!res.ok) return null;
    const { resolvedUrl, lat, lng } = (await res.json()) as {
      resolvedUrl?: string;
      lat?: number;
      lng?: number;
    };
    if (typeof lat === 'number' && typeof lng === 'number' && isValidCoords(lat, lng)) {
      return { lat, lng };
    }
    if (!resolvedUrl) return null;
    return parseGoogleMapsUrl(resolvedUrl);
  } catch {
    return null;
  }
}

function isValidCoords(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
