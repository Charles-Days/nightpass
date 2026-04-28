import { Badge } from '@/core/components/ui/badge';
import type { EventStatus } from '@/core/types/api';

const LABEL: Record<EventStatus, string> = {
  DRAFT: 'Borrador', PUBLISHED: 'Publicado', CANCELED: 'Cancelado',
};
const VARIANT: Record<EventStatus, 'outline' | 'success' | 'destructive'> = {
  DRAFT: 'outline', PUBLISHED: 'success', CANCELED: 'destructive',
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
