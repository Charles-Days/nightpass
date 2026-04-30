'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { VenueForm } from '@/features/venues/components/venue-form';
import { useCreateVenue } from '@/features/venues/hooks/use-create-venue';
import { useApplication } from '@/features/venue-applications/hooks/use-application';
import { paths } from '@/core/config/paths';

export default function CreateVenuePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('applicationId');

  const { data: application, isLoading: isLoadingApp } = useApplication(applicationId);
  const create = useCreateVenue();

  if (applicationId && isLoadingApp) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const initialData = application
    ? {
        name: application.venueName,
        city: application.city,
        address: application.address ?? '',
        phone: application.phone ?? '',
        ownerUserId: application.applicantUserId,
      }
    : undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Nuevo Establecimiento</h1>
          <p className="text-muted-foreground">
            {applicationId 
              ? `Completando registro desde la solicitud de ${application?.applicant?.name}` 
              : 'Crea un nuevo local desde cero'}
          </p>
        </div>
      </div>

      <VenueForm
        initialData={initialData}
        isPending={create.isPending}
        onSubmit={(data) => {
          create.mutate(data, {
            onSuccess: () => router.push(paths.adminVenues),
          });
        }}
        submitLabel="Crear Establecimiento"
      />
    </div>
  );
}
