import { absoluteUrl, siteUrl } from '@/core/config/env';

/**
 * Inyecta un bloque JSON-LD (schema.org). `data` es un objeto controlado por
 * el servidor (nunca input crudo de usuario sin sanitizar), por eso es seguro
 * serializarlo. Escapa `<` para evitar romper el cierre del script.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

// ── Builders ────────────────────────────────────────────────────────────────

export function organizationLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'NightPass',
    url: siteUrl(),
    logo: absoluteUrl('/icons/icon-512.png'),
    description: 'Tu pase a la noche: descubre bares, eventos y compra tus pases.',
  };
}

export function websiteLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'NightPass',
    url: siteUrl(),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl('/app')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbLd(
  items: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function eventLd(input: {
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  image?: string | null;
  path: string;
  locationName?: string | null;
  city?: string | null;
  priceCents?: number | null;
  currency?: string | null;
}): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: input.name,
    url: absoluteUrl(input.path),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
  };
  if (input.description) ld.description = input.description;
  if (input.startDate) ld.startDate = input.startDate;
  if (input.endDate) ld.endDate = input.endDate;
  if (input.image) ld.image = [input.image];
  if (input.locationName || input.city) {
    ld.location = {
      '@type': 'Place',
      name: input.locationName ?? input.city,
      ...(input.city
        ? { address: { '@type': 'PostalAddress', addressLocality: input.city } }
        : {}),
    };
  }
  if (typeof input.priceCents === 'number') {
    ld.offers = {
      '@type': 'Offer',
      price: (input.priceCents / 100).toFixed(2),
      priceCurrency: (input.currency ?? 'MXN').toUpperCase(),
      url: absoluteUrl(input.path),
      availability: 'https://schema.org/InStock',
    };
  }
  return ld;
}

export function localBusinessLd(input: {
  name: string;
  description?: string | null;
  image?: string | null;
  path: string;
  city?: string | null;
  address?: string | null;
}): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'NightClub',
    name: input.name,
    url: absoluteUrl(input.path),
  };
  if (input.description) ld.description = input.description;
  if (input.image) ld.image = [input.image];
  if (input.city || input.address) {
    ld.address = {
      '@type': 'PostalAddress',
      ...(input.address ? { streetAddress: input.address } : {}),
      ...(input.city ? { addressLocality: input.city } : {}),
    };
  }
  return ld;
}
