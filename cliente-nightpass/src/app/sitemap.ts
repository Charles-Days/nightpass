import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/core/config/env';
import { publicFetch } from '@/core/lib/api/server-client';
import { paths } from '@/core/config/paths';

interface SitemapFeed {
  venues: { slug: string; updatedAt: string }[];
  events: { id: string; updatedAt: string }[];
  promoters: { slug: string; updatedAt: string }[];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl(paths.home),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: absoluteUrl(paths.appHome),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: absoluteUrl(paths.eventos),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: absoluteUrl(paths.solicitarLocal),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: absoluteUrl(paths.solicitarOrganizador),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: absoluteUrl('/privacidad'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  try {
    const feed = await publicFetch<SitemapFeed>('/catalog/sitemap', {
      revalidate: 3600,
    });

    const venueRoutes: MetadataRoute.Sitemap = feed.venues.map((venue) => ({
      url: absoluteUrl(`${paths.bar}/${venue.slug}`),
      lastModified: new Date(venue.updatedAt),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const eventRoutes: MetadataRoute.Sitemap = feed.events.map((event) => ({
      url: absoluteUrl(`${paths.evento}/${event.id}`),
      lastModified: new Date(event.updatedAt),
      changeFrequency: 'daily',
      priority: 0.7,
    }));

    const promoterRoutes: MetadataRoute.Sitemap = feed.promoters.map((promoter) => ({
      url: absoluteUrl(`${paths.promotora}/${promoter.slug}`),
      lastModified: new Date(promoter.updatedAt),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    return [...staticRoutes, ...venueRoutes, ...eventRoutes, ...promoterRoutes];
  } catch {
    // Backend caído / inalcanzable: degradar a las rutas estáticas en vez de
    // romper el build del sitemap.
    return staticRoutes;
  }
}
