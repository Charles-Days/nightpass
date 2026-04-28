import { Badge } from '@/core/components/ui/badge';
import type { VenueStatus } from '@/core/types/api';

const LABEL: Record<VenueStatus, string> = {
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
};

const VARIANT: Record<VenueStatus, 'success' | 'destructive'> = {
  ACTIVE: 'success',
  SUSPENDED: 'destructive',
};

export function VenueStatusBadge({ status }: { status: VenueStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
