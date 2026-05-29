'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { saveRpRef, extractRefFromPath } from '@/features/rp-referral/rp-referral';

function RefTrackerInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // ref directo en la URL (?ref=CODE) o anidado dentro de ?from= cuando el
    // middleware nos mandó al login con la ruta original (?from=/app/evento/abc?ref=CODE).
    const ref = searchParams.get('ref') ?? extractRefFromPath(searchParams.get('from'));
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
