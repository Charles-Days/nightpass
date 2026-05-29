'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { saveRpRef } from '@/features/rp-referral/rp-referral';

function RefTrackerInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      saveRpRef(ref);
    }
  }, [searchParams]);

  return null;
}

export function RefTracker() {
  return (
    <Suspense fallback={null}>
      <RefTrackerInner />
    </Suspense>
  );
}
