import { ImageResponse } from 'next/og';
import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

interface StoryPayload {
  n: string; // firstName
  e: string; // eventTitle
  d: string; // eventDateLabel
  t: string; // tierName (VIP, General, ...)
  m: string; // método de pago (Tarjeta / Efectivo)
}

function decodePayload(payloadB64: string): StoryPayload {
  let b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  const json = Buffer.from(b64, 'base64').toString('utf8');
  const parsed = JSON.parse(json) as Partial<StoryPayload>;
  return {
    n: typeof parsed.n === 'string' ? parsed.n : '',
    e: typeof parsed.e === 'string' ? parsed.e : '',
    d: typeof parsed.d === 'string' ? parsed.d : '',
    t: typeof parsed.t === 'string' ? parsed.t : '',
    m: typeof parsed.m === 'string' ? parsed.m : '',
  };
}

export async function GET(req: NextRequest) {
  const d = req.nextUrl.searchParams.get('d');
  const s = req.nextUrl.searchParams.get('s');

  if (!d || !s) {
    return new Response('Bad request', { status: 400 });
  }

  // Verify HMAC signature over the EXACT payloadB64 string.
  const expected = createHmac('sha256', process.env.STORY_CARD_SECRET ?? '')
    .update(d)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(s, 'utf8');

  if (
    expectedBuf.length !== providedBuf.length ||
    !timingSafeEqual(expectedBuf, providedBuf)
  ) {
    return new Response('Forbidden', { status: 403 });
  }

  let payload: StoryPayload;
  try {
    payload = decodePayload(d);
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const firstName = payload.n;
  const eventTitle = payload.e;
  const eventDateLabel = payload.d;
  const tierName = payload.t;
  const methodLabel = payload.m;

  const kicker = firstName ? `${firstName} ya tiene su lugar` : 'Ya tengo mi lugar';
  const tierLabel = tierName ? `ENTRADA ${tierName.toUpperCase()}` : 'TENGO MI ENTRADA';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1920px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          backgroundColor: '#0a0712',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Soft purple radial glow */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: '0px',
            left: '0px',
            width: '1080px',
            height: '1920px',
            background:
              'radial-gradient(900px 760px at 50% 22%, rgba(168,85,247,0.30), rgba(10,7,18,0) 70%)',
          }}
        />
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: '0px',
            left: '0px',
            width: '1080px',
            height: '1920px',
            background:
              'radial-gradient(760px 640px at 50% 88%, rgba(147,51,234,0.20), rgba(10,7,18,0) 70%)',
          }}
        />

        {/* Content stack */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '1080px',
            height: '1920px',
            padding: '120px 96px',
            position: 'relative',
          }}
        >
          {/* Top: wordmark */}
          <div
            style={{
              display: 'flex',
              fontSize: '40px',
              fontWeight: 800,
              letterSpacing: '14px',
              color: '#e9d5ff',
            }}
          >
            NIGHTPASS
          </div>

          {/* Center: invitation / flex */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '34px',
                fontWeight: 500,
                color: 'rgba(245,243,255,0.65)',
                marginBottom: '40px',
              }}
            >
              {kicker}
            </div>

            {/* Tier pill — el flex */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: '22px',
                paddingBottom: '22px',
                paddingLeft: '60px',
                paddingRight: '60px',
                borderRadius: '999px',
                marginBottom: '20px',
                backgroundColor: 'rgba(168,85,247,0.22)',
                border: '2px solid rgba(168,85,247,0.55)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: '46px',
                  fontWeight: 800,
                  letterSpacing: '6px',
                  color: '#e9d5ff',
                }}
              >
                {tierLabel}
              </div>
            </div>

            {/* Método de pago */}
            {methodLabel ? (
              <div
                style={{
                  display: 'flex',
                  fontSize: '30px',
                  fontWeight: 500,
                  letterSpacing: '3px',
                  color: 'rgba(245,243,255,0.55)',
                  marginBottom: '52px',
                }}
              >
                {`Pago · ${methodLabel}`}
              </div>
            ) : null}

            {/* Event title — hero */}
            <div
              style={{
                display: 'flex',
                fontSize: '104px',
                fontWeight: 800,
                lineHeight: 1.04,
                color: '#ffffff',
                maxWidth: '900px',
                marginBottom: '28px',
                textAlign: 'center',
              }}
            >
              {eventTitle}
            </div>

            <div
              style={{
                display: 'flex',
                fontSize: '38px',
                fontWeight: 400,
                color: 'rgba(245,243,255,0.6)',
              }}
            >
              {eventDateLabel}
            </div>
          </div>

          {/* Bottom: FOMO + CTA */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '64px',
                fontWeight: 800,
                color: '#ffffff',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              ¿Te lo vas a perder?
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '34px',
                fontWeight: 500,
                color: 'rgba(216,180,254,0.9)',
                marginBottom: '44px',
              }}
            >
              Consigue la tuya en NightPass
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '36px',
                fontWeight: 600,
                color: 'rgba(245,243,255,0.7)',
              }}
            >
              @nightpass_mx
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      headers: {
        'Content-Disposition': 'attachment; filename="nightpass-historia.png"',
        'Cache-Control': 'no-store, must-revalidate',
      },
    },
  );
}
