'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';

export type NotificationType =
  | 'PHYSICAL_REQUEST_CREATED'
  | 'PHYSICAL_REQUEST_CONFIRMED'
  | 'PHYSICAL_REQUEST_CANCELLED'
  | 'PHYSICAL_REQUEST_EXPIRED';

// Payload extra que el backend guarda en `data` — detalle completo del cliente
// y la solicitud, para renderizar inline en la campana sin otra consulta.
export interface NotificationData {
  requestId?: string;
  eventId?: string;
  eventTitle?: string;
  tierName?: string;
  quantity?: number;
  amountCents?: number;
  currency?: string;
  status?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  contactPhone?: string | null;
  customerCity?: string | null;
  customerState?: string | null;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  url: string | null;
  data: NotificationData | null;
  readAt: string | null;
  createdAt: string;
}

const KEYS = {
  list: ['notifications', 'list'] as const,
  unread: ['notifications', 'unread-count'] as const,
};

/** Conteo de no leídas — alimenta el badge. Poll cada 30s. */
export function useUnreadCount() {
  return useQuery({
    queryKey: KEYS.unread,
    queryFn: () =>
      clientFetch<{ count: number }>('/api/notifications/unread-count'),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** Lista de notificaciones. Solo se activa cuando `enabled` (campana abierta). */
export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: KEYS.list,
    queryFn: () =>
      clientFetch<{ items: NotificationItem[] }>('/api/notifications'),
    enabled,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      clientFetch(`/api/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.list });
      qc.invalidateQueries({ queryKey: KEYS.unread });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      clientFetch('/api/notifications/read-all', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.list });
      qc.invalidateQueries({ queryKey: KEYS.unread });
    },
  });
}
