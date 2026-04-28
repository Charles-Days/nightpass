'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/core/components/ui/sheet';
import { VenueStatusBadge } from './status-badge';
import { VenueDetail } from './venue-detail';
import { useVenue } from '../hooks/use-venue';

function Skeleton() {
  return (
    <div className="space-y-4 p-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/30" />
      ))}
    </div>
  );
}

interface VenueSheetProps {
  venueId: string | null;
  onClose: () => void;
}

export function VenueSheet({ venueId, onClose }: VenueSheetProps) {
  const { data: venue, isLoading } = useVenue(venueId);

  return (
    <Sheet open={!!venueId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden p-0 sm:max-w-2xl"
      >
        {/* Header fijo */}
        <SheetHeader className="shrink-0 border-b px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4 pr-6">
            <div>
              <SheetTitle className="font-display text-xl">
                {venue?.name ?? '—'}
              </SheetTitle>
              <SheetDescription>
                {venue ? (
                  <>
                    {venue.city} ·{' '}
                    <code className="rounded bg-muted px-1 text-[11px]">{venue.slug}</code>
                  </>
                ) : null}
              </SheetDescription>
            </div>
            {venue ? <VenueStatusBadge status={venue.status} /> : null}
          </div>
        </SheetHeader>

        {/* Área scrollable — min-h-0 es clave para que flex-1 no desborde */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {isLoading || !venue ? (
            <Skeleton />
          ) : (
            <VenueDetail venue={venue} hideHeader />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
