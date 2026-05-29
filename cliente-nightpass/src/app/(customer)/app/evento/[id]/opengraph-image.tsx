import { ImageResponse } from 'next/og';
import { OG_SIZE, OG_CONTENT_TYPE, OgFrame } from '@/core/seo/og';
import { publicFetch } from '@/core/lib/api/server-client';
import type { CatalogEventDetail } from '@/core/types/api';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Evento — NightPass';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const ev = await publicFetch<CatalogEventDetail>(`/catalog/events/${id}`, {
      revalidate: 300,
    });

    const subtitle = ev.venue
      ? `${ev.venue.name} · ${ev.venue.city}`
      : ev.externalVenueName
        ? `${ev.externalVenueName}${ev.externalVenueCity ? ` · ${ev.externalVenueCity}` : ''}`
        : (ev.promoter?.name ??
          new Intl.DateTimeFormat('es-MX', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
          }).format(new Date(ev.startsAt)));

    return new ImageResponse(
      <OgFrame eyebrow="Evento" title={ev.title} subtitle={subtitle} />,
      { ...size },
    );
  } catch {
    return new ImageResponse(<OgFrame eyebrow="Evento" title="Evento" />, { ...size });
  }
}
