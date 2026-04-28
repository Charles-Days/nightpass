import { notFound } from 'next/navigation';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import type { Venue } from '@/core/types/api';
import { VenueDetail } from '@/features/venues';

export const metadata = { title: 'Local' };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VenueDetailPage({ params }: PageProps) {
  const { id } = await params;
  let venue: Venue;
  try {
    venue = await serverFetch<Venue>(`/venues/${id}`);
  } catch (err) {
    if (err instanceof ServerApiError && err.status === 404) notFound();
    throw err;
  }
  return <VenueDetail venue={venue} />;
}
