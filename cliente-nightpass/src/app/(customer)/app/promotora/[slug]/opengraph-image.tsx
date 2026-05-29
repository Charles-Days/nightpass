import { ImageResponse } from 'next/og';
import { OG_SIZE, OG_CONTENT_TYPE, OgFrame } from '@/core/seo/og';
import { publicFetch } from '@/core/lib/api/server-client';
import type { CatalogPromoterDetail } from '@/core/types/api';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Organizador — NightPass';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const promoter = await publicFetch<CatalogPromoterDetail>(`/catalog/promoters/${slug}`, {
      revalidate: 300,
    });

    return new ImageResponse(
      <OgFrame eyebrow="Organizador" title={promoter.name} subtitle={promoter.city || undefined} />,
      { ...size },
    );
  } catch {
    return new ImageResponse(<OgFrame eyebrow="Organizador" title="Organizador" />, { ...size });
  }
}
