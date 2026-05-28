'use client';

import { Download } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/core/components/ui/button';

export function ExportCsvButton({ venueId }: { venueId: string }) {
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';

  const handleClick = () => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const url = `/api/pases/venues/${venueId}/export${qs.toString() ? `?${qs}` : ''}`;
    window.location.href = url;
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="border-white/15 bg-white/[0.04] text-white/85 hover:bg-white/[0.07] hover:text-white"
    >
      <Download className="size-4" />
      Exportar CSV
    </Button>
  );
}
