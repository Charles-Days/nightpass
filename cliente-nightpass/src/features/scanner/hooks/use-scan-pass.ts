'use client';

import { useMutation } from '@tanstack/react-query';
import { clientFetch, ClientApiError } from '@/core/lib/api/client-client';

export interface ScanResult {
  valid: boolean;
  reason?: string;
  usedAt?: string | null;
  holder: { id: string; email: string; name: string | null };
  tier: { id: string; name: string };
  event: { id: string; title: string; venue?: string };
}

export function useScanPass() {
  return useMutation<ScanResult, ClientApiError, { qrCode: string }>({
    mutationFn: (input) =>
      clientFetch<ScanResult>('/api/passes/scan', {
        method: 'POST',
        body: input,
      }),
  });
}
