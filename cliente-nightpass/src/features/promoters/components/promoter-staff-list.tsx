'use client';

import { Loader2 } from 'lucide-react';
import { Badge } from '@/core/components/ui/badge';
import { Button } from '@/core/components/ui/button';
import { usePromoterStaff } from '../hooks/use-promoter-staff';
import { useRevokePromoterStaff } from '../hooks/use-revoke-promoter-staff';

export function PromoterStaffList() {
  const { data, isLoading } = usePromoterStaff();
  const revoke = useRevokePromoterStaff();

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-lg bg-muted/30" />;
  }

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin staff activo.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/14 bg-card/50">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-white/12 bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Rol</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {data.map((member) => (
            <tr
              key={member.id}
              className="border-b border-border/50 last:border-0"
            >
              <td className="px-4 py-3">
                <p className="font-medium">
                  {member.user.name ?? member.user.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.user.email}
                </p>
              </td>
              <td className="px-4 py-3">
                <Badge variant="secondary">Staff</Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(member.userId)}
                >
                  {revoke.isPending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : null}
                  Revocar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
