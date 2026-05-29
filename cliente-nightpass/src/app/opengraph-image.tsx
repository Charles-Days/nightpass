import { ImageResponse } from 'next/og';
import { OG_SIZE, OG_CONTENT_TYPE, OgFrame } from '@/core/seo/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'NightPass';

export default function Image() {
  return new ImageResponse(
    <OgFrame title="Tu pase a la noche" subtitle="Bares · Eventos · Pases" />,
    { ...size },
  );
}
