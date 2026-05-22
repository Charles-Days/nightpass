'use client';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/core/components/ui/badge';
import { Button } from '@/core/components/ui/button';
import type { VenueStaffRole, VenueStaffStatus } from '@/core/types/api';
import { useVenueStaff } from '../hooks/use-venue-staff';
import { useRevokeStaff } from '../hooks/use-revoke-staff';

const ROLE_LABEL: Record<VenueStaffRole, string> = { MANAGER: 'Manager', SCANNER: 'Scanner' };
const STATUS_LABEL: Record<VenueStaffStatus, string> = { PENDING: 'Pendiente', ACTIVE: 'Activo', REVOKED: 'Revocado' };
const STATUS_VARIANT: Record<VenueStaffStatus, 'warning' | 'success' | 'destructive'> = {
  PENDING: 'warning', ACTIVE: 'success', REVOKED: 'destructive',
};

export function StaffTable({ venueId }: { venueId: string }) {
  const { data, isLoading } = useVenueStaff(venueId);
  const revoke = useRevokeStaff(venueId);

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-lg bg-muted/30" />;
  }

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin staff activo.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card/50">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Rol</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((member) => (
            <tr key={member.id} className="border-b border-border/50 last:border-0">
              <td className="px-4 py-3">
                <p className="font-medium">{member.user.name ?? member.user.email}</p>
                <p className="text-xs text-muted-foreground">{member.user.email}</p>
              </td>
              <td className="px-4 py-3">
                <Badge variant="secondary">{ROLE_LABEL[member.staffRole]}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_VARIANT[member.status]}>{STATUS_LABEL[member.status]}</Badge>
              </td>
              <td className="px-4 py-3 text-right">
                {member.status !== 'REVOKED' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(member.userId)}
                  >
                    {revoke.isPending ? <Loader2 className="size-3 animate-spin" /> : null}
                    Revocar
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
