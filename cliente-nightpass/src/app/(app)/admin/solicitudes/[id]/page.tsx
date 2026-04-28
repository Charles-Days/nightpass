import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import type { VenueApplication } from '@/core/types/api';
import { ApplicationDetail } from '@/features/venue-applications/components/application-detail';
import { paths } from '@/core/config/paths';

export const metadata = { title: 'Detalle de solicitud' };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  let application: VenueApplication;
  try {
    application = await serverFetch<VenueApplication>(`/venue-applications/${id}`);
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="space-y-4">
      <Link
        href={paths.adminApplications}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver a la lista
      </Link>
      <ApplicationDetail application={application} />
    </div>
  );
}
