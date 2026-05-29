import { ImageResponse } from 'next/og';
import { OG_SIZE, OG_CONTENT_TYPE, OgFrame } from '@/core/seo/og';
import { publicFetch } from '@/core/lib/api/server-client';
import type { CatalogVenueDetail } from '@/core/types/api';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Bar — NightPass';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const venue = await publicFetch<CatalogVenueDetail>(`/catalog/venues/${slug}`, {
      revalidate: 300,
    });

    return new ImageResponse(
      <OgFrame eyebrow="Bar" title={venue.name} subtitle={venue.city} />,
      { ...size },
    );
  } catch {
    return new ImageResponse(<OgFrame eyebrow="Bar" title="Bar" />, { ...size });
  }
}
