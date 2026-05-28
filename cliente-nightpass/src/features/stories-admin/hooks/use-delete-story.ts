'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { clientFetch } from '@/core/lib/api/client-client';

interface UseDeleteStoryOptions {
  venueId?: string;
  onSuccess?: () => void;
}

export function useDeleteStory(opts: string | UseDeleteStoryOptions = {}) {
  const options: UseDeleteStoryOptions = typeof opts === 'string' ? { venueId: opts } : opts;
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (id: string) =>
      clientFetch<{ ok: boolean } | undefined>(`/api/stories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Historia eliminada');
      if (options.venueId) {
        qc.invalidateQueries({ queryKey: ['stories-mine', options.venueId] });
      }
      qc.invalidateQueries({ queryKey: ['stories-mine-event'] });
      router.refresh();
      options.onSuccess?.();
    },
    onError: () => toast.error('No pudimos eliminar la historia.'),
  });
}
