'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { clientFetch } from '@/core/lib/api/client-client';

export function useDeleteStory(venueId: string) {
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (id: string) =>
      clientFetch<{ ok: boolean } | undefined>(`/api/stories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Historia eliminada');
      qc.invalidateQueries({ queryKey: ['stories-mine', venueId] });
      router.refresh();
    },
    onError: () => toast.error('No pudimos eliminar la historia.'),
  });
}
