'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientFetch } from '@/core/lib/api/client-client';

export interface RpProfile {
  id: string;
  userId: string;
  rpCode: string;
  displayName: string;
  isActive: boolean;
  promoterId: string | null;
  state?: string | null;
  city?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    email: string;
    role: string;
    phone?: string | null;
  };
  promoter?: {
    name: string;
  } | null;
}

export interface RpStats {
  rpId: string;
  displayName: string;
  rpCode: string;
  totalSales: number;
  totalEarningsCents: number;
  /** ¿Tiene ≥1 evento asignado con pago en efectivo activo? Gatea la cobranza. */
  hasCashEvents?: boolean;
  eventStats: Array<{
    eventId: string;
    eventName: string;
    eventStartsAt: string | null;
    eventEndsAt: string | null;
    eventCoverImageUrl: string | null;
    isPassed: boolean;
    salesCount: number;
    earningsCents: number;
    rule: {
      id: string;
      type: 'PER_N_TICKETS' | 'PERCENTAGE';
      nTickets: number | null;
      rewardCents: number | null;
      percentage: number | null;
    } | null;
  }>;
  sales: Array<{
    id: string;
    createdAt: string;
    eventName: string;
    tierName: string;
    priceCents: number;
    totalCents: number;
  }>;
}

export interface CommissionRule {
  id: string;
  rpProfileId: string;
  eventId: string | null;
  type: 'PER_N_TICKETS' | 'PERCENTAGE';
  nTickets: number | null;
  rewardCents: number | null;
  currency: string;
  percentage: number | null;
  isActive: boolean;
  event?: {
    title: string;
  } | null;
}

// `basePath` permite reusar estos hooks tanto en el panel admin (`/api/rp`)
// como en el panel del organizador (`/api/rp/promoter/mine`), que expone las
// mismas operaciones pero scopeadas a su propia organización.
export function useRpList(
  query: { search?: string; promoterId?: string; page?: number; limit?: number },
  basePath: string = '/api/rp',
) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.promoterId) params.set('promoterId', query.promoterId);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const queryString = params.toString() ? `?${params.toString()}` : '';

  return useQuery({
    queryKey: ['rps', basePath, query],
    queryFn: () =>
      clientFetch<{ items: RpProfile[]; total: number; page: number; limit: number }>(`${basePath}${queryString}`),
  });
}

export function useRpDetail(id: string | null) {
  return useQuery({
    queryKey: ['rps', 'detail', id],
    queryFn: () => clientFetch<RpProfile>(`/api/rp/${id}`),
    enabled: !!id,
  });
}

export function useRpStats(id: string | null, basePath: string = '/api/rp') {
  return useQuery({
    queryKey: ['rps', 'stats', basePath, id],
    queryFn: () => clientFetch<RpStats>(`${basePath}/${id}/stats`),
    enabled: !!id,
  });
}

export function useRpMeStats() {
  return useQuery({
    queryKey: ['rp-me', 'stats'],
    queryFn: () => clientFetch<RpStats>('/api/rp/me/stats'),
  });
}

/** Perfil del RP autenticado (zona + teléfono). Clave bajo 'rps' para que la
 *  edición de zona/teléfono (que invalida ['rps']) lo refresque. */
export function useRpMe() {
  return useQuery({
    queryKey: ['rps', 'me', 'profile'],
    queryFn: () => clientFetch<RpProfile>('/api/rp/me'),
  });
}

export interface IssuedPass {
  id: string;
  token: string;
  status: 'PENDING' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';
  amountCents: number;
  currency: string;
  expiresAt: string;
  event: { id: string; title: string; startsAt: string };
  tier: { id: string; name: string };
}

// Tiers de un evento (vía catálogo público, con precio vigente).
export function useEventTiers(eventId: string | null) {
  return useQuery({
    queryKey: ['catalog-event-tiers', eventId],
    enabled: !!eventId,
    queryFn: () =>
      clientFetch<{
        tiers: Array<{
          id: string;
          name: string;
          priceCents: number;
          // Precio en efectivo (bruto − Stripe [− NP si exento]). El RP cobra en
          // efectivo, así que el modal muestra este, no el online (priceCents).
          cashPriceCents?: number | null;
          currency: string;
        }>;
      }>(`/api/catalog/events/${eventId}`),
  });
}

// El RP emite un vale (venta en efectivo) → devuelve el token para pintar el QR.
export function useIssueRpPass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { eventId: string; tierId: string }) =>
      clientFetch<IssuedPass>('/api/rp/passes/issue', { method: 'POST', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rp-me', 'issued'] });
    },
  });
}

// Vale emitido con su estado y reclamante (para la lista del panel del RP).
export interface IssuedPassDetail extends IssuedPass {
  claimedAt: string | null;
  createdAt: string;
  claimedBy: { name: string | null; email: string } | null;
}

// Lista de los últimos vales emitidos por el RP.
export function useListIssuedRpPasses() {
  return useQuery({
    queryKey: ['rp-me', 'issued'],
    queryFn: () => clientFetch<IssuedPassDetail[]>('/api/rp/passes/issued'),
    refetchInterval: 30_000,
  });
}

// El RP cancela un vale PENDING que emitió (libera el aforo).
export function useCancelIssuedRpPass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (claimId: string) =>
      clientFetch<{ id: string; status: string }>(`/api/rp/passes/${claimId}/cancel`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rp-me', 'issued'] });
    },
  });
}

export function useCreateRp(basePath: string = '/api/rp') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; displayName: string; phone?: string; state?: string; city?: string; password?: string; promoterId?: string; eventId?: string }) =>
      clientFetch<RpProfile>(basePath, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rps'] });
    },
  });
}

export function useUpdateRpZone(basePath: string = '/api/rp') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      state,
      city,
      phone,
    }: {
      id: string;
      state?: string;
      city?: string;
      phone?: string;
    }) =>
      clientFetch<RpProfile>(`${basePath}/${id}/zone`, {
        method: 'PATCH',
        body: { state, city, phone },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rps'] });
    },
  });
}

export function useToggleRpActive(basePath: string = '/api/rp') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      clientFetch<RpProfile>(`${basePath}/${id}/toggle-active`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rps'] });
    },
  });
}

export function useSetCommissionRule(basePath: string = '/api/rp') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rpId,
      data,
    }: {
      rpId: string;
      data: {
        eventId?: string;
        type: 'PER_N_TICKETS' | 'PERCENTAGE';
        nTickets?: number;
        rewardCents?: number;
        currency?: string;
        percentage?: number;
      };
    }) =>
      clientFetch<CommissionRule>(`${basePath}/${rpId}/commission-rules`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rps'] });
    },
  });
}

// ── Solicitudes de pago en efectivo (PhysicalPaymentRequest) ───────────────

export type PhysicalRequestStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface PhysicalPaymentRequest {
  id: string;
  status: PhysicalRequestStatus;
  quantity: number;
  amountCents: number;
  currency: string;
  contactPhone: string | null;
  note: string | null;
  expiresAt: string;
  confirmedAt: string | null;
  createdAt: string;
  orderId: string | null;
  event: { id: string; title: string; startsAt: string };
  tier: { id: string; name: string };
  customer: { name: string | null; email: string } | null;
  confirmedByRp: { displayName: string; rpCode: string } | null;
  // Punto de cobro elegido por el cliente + slot (día/hora). Null en solicitudes
  // viejas o ruteadas sin punto explícito.
  pickupPoint: { id: string; label: string; reference: string | null } | null;
  pickupAt: string | null;
}

export function useRpPhysicalRequests(status?: PhysicalRequestStatus) {
  const qs = status ? `?status=${status}` : '';
  return useQuery({
    queryKey: ['physical-requests', 'rp', status ?? 'all'],
    queryFn: () =>
      clientFetch<{ items: PhysicalPaymentRequest[] }>(`/api/physical-payments/rp${qs}`),
  });
}

export function useConfirmPhysicalRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      clientFetch<PhysicalPaymentRequest>(`/api/physical-payments/${id}/confirm`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-requests'] });
      queryClient.invalidateQueries({ queryKey: ['rp-me'] });
    },
  });
}

export function useCancelPhysicalRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      clientFetch<{ ok: boolean }>(`/api/physical-payments/${id}/cancel`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['physical-requests'] });
    },
  });
}

export function useDeleteCommissionRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rpId, ruleId }: { rpId: string; ruleId: string }) =>
      clientFetch<{ ok: boolean }>(`/api/rp/${rpId}/commission-rules/${ruleId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, { rpId }) => {
      queryClient.invalidateQueries({ queryKey: ['rps', 'detail', rpId] });
      queryClient.invalidateQueries({ queryKey: ['rps', 'stats', rpId] });
    },
  });
}

// ── Puntos de cobro del RP (efectivo) ──────────────────────────────────────
// El RP define lugares (lat/lng + horarios) donde cobra en persona. El cliente
// elige el más cercano al pagar en efectivo. Ver docs/RP_PUNTOS_COBRO.md.

/** Ventana horaria de un punto. `dow`: 0-6 (Dom-Sáb) o null = cualquier día. */
export interface PickupWindow {
  dow: number | null;
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

export interface PickupPoint {
  id: string;
  label: string;
  /** Referencia en texto de dónde está exactamente el RP (el pin es aproximado). */
  reference: string | null;
  latitude: number;
  longitude: number;
  mapsUrl: string | null;
  windows: PickupWindow[];
  isVenueDoor: boolean;
  isActive: boolean;
}

/** Punto + distancia al cliente + RP dueño (respuesta del listado por cercanía). */
export interface NearbyPickupPoint extends PickupPoint {
  distanceM: number | null;
  rpId: string;
  rpDisplayName: string;
}

export interface PickupPointInput {
  label: string;
  reference?: string;
  mapsUrl?: string;
  latitude?: number;
  longitude?: number;
  windows: PickupWindow[];
  isVenueDoor?: boolean;
}

// `basePath` permite reusar el manager de puntos en 3 contextos:
//   - RP propio:   '/api/rp'                         (default)
//   - Admin:       '/api/rp/<rpId>'
//   - Organizador: '/api/rp/promoter/mine/<rpId>'
// El endpoint queda `${basePath}/pickup-points`.
export function useRpPickupPoints(basePath: string = '/api/rp') {
  return useQuery({
    queryKey: ['pickup-points', basePath],
    queryFn: () => clientFetch<PickupPoint[]>(`${basePath}/pickup-points`),
  });
}

export function useCreatePickupPoint(basePath: string = '/api/rp') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PickupPointInput) =>
      clientFetch<PickupPoint>(`${basePath}/pickup-points`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['pickup-points', basePath] }),
  });
}

export function useUpdatePickupPoint(basePath: string = '/api/rp') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PickupPointInput> }) =>
      clientFetch<PickupPoint>(`${basePath}/pickup-points/${id}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['pickup-points', basePath] }),
  });
}

export function useDeletePickupPoint(basePath: string = '/api/rp') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      clientFetch<{ ok: boolean }>(`${basePath}/pickup-points/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['pickup-points', basePath] }),
  });
}

/** Resuelve un link de Google Maps a coords (para previsualizar el pin al pegar). */
export function useResolveMapsLink() {
  return useMutation({
    mutationFn: (url: string) =>
      clientFetch<{ lat: number; lng: number }>('/api/rp/pickup-points/resolve', {
        method: 'POST',
        body: { url },
      }),
  });
}

/** Cliente: puntos del/los RP del evento, ordenados por cercanía. Si no hay
 *  coords, el backend devuelve `distanceM=null` y ordena por label. */
export function useNearbyPickupPoints(
  tierId: string | null,
  coords: { lat: number; lng: number } | null,
) {
  const params = new URLSearchParams();
  if (tierId) params.set('tierId', tierId);
  if (coords) {
    params.set('lat', String(coords.lat));
    params.set('lng', String(coords.lng));
  }
  return useQuery({
    queryKey: ['pickup-points', 'nearby', tierId, coords?.lat ?? null, coords?.lng ?? null],
    enabled: !!tierId,
    queryFn: () =>
      clientFetch<{ points: NearbyPickupPoint[] }>(
        `/api/physical-payments/pickup-points?${params.toString()}`,
      ),
  });
}
