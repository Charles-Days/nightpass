import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';

export interface IssuedPass {
  id: string;
  token: string;
  status: 'PENDING' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';
  amountCents: number;
  currency: string;
  expiresAt: string;
  createdAt: string;
  claimedAt?: string;
  event: {
    id: string;
    title: string;
    startsAt: string;
  };
  tier: {
    id: string;
    name: string;
  };
  claimedBy?: {
    name: string;
    email: string;
  } | null;
  issuedByRp?: {
    displayName: string;
    rpCode: string;
  } | null;
  generatedByAdmin?: {
    name: string;
    email: string;
  } | null;
}

export interface GeneratePassInput {
  eventId: string;
  tierId: string;
  rpCode?: string;
  comp?: boolean;
}

export function useAdminGeneratePass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GeneratePassInput) =>
      clientFetch<IssuedPass>('/api/admin/passes/generate', {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-issued-passes'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['catalog-event-tiers'] });
      queryClient.invalidateQueries({ queryKey: ['pases-stats'] });
    },
  });
}

export function useAdminIssuedPasses(eventId?: string) {
  return useQuery({
    queryKey: ['admin-issued-passes', eventId],
    queryFn: () => {
      const url = eventId
        ? `/api/admin/passes/issued?eventId=${eventId}`
        : '/api/admin/passes/issued';
      return clientFetch<IssuedPass[]>(url);
    },
  });
}

export function useResolveRpCode(code: string, enabled: boolean) {
  return useQuery({
    queryKey: ['rp-resolve-code', code],
    enabled: enabled && code.length > 2,
    retry: false,
    queryFn: () =>
      clientFetch<{ id: string; displayName: string }>(`/api/rp/resolve/${code}`),
  });
}
