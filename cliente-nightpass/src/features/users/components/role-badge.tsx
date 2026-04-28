import { Badge } from '@/core/components/ui/badge';
import type { Role } from '@/core/types/api';

const LABEL: Record<Role, string> = {
  ADMIN: 'Admin',
  VENUE_OWNER: 'Dueño',
  VENUE_STAFF: 'Staff',
  CUSTOMER: 'Cliente',
};

const VARIANT: Record<Role, 'default' | 'success' | 'warning' | 'secondary'> = {
  ADMIN: 'default',
  VENUE_OWNER: 'success',
  VENUE_STAFF: 'warning',
  CUSTOMER: 'secondary',
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge variant={VARIANT[role]}>{LABEL[role]}</Badge>;
}
