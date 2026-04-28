'use client';
import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';
import type { VenueStaffMember } from '@/core/types/api';

export function useVenueStaff(venueId: string) {
  return useQuery({
    queryKey: ['venue-staff', venueId],
    queryFn: () => clientFetch<VenueStaffMember[]>(`/api/venues/${venueId}/staff`),
  });
}
