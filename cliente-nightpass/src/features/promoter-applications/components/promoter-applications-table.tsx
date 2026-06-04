'use client';

import * as React from 'react';
import { Eye, Inbox, Loader2 } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/core/components/ui/dialog';
import type { PaginatedPromoterApplications } from '@/core/types/api';
import { usePromoterApplication } from '../hooks/use-promoter-application';
import { PromoterApplicationDetail } from './promoter-application-detail';
import { StatusBadge } from '@/features/venue-applications/components/status-badge';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
}

function PromoterApplicationModal({
  applicationId,
  onClose,
}: {
  applicationId: string | null;
  onClose: () => void;
}) {
  const { data: application, isLoading } = usePromoterApplication(applicationId);

  return (
    <Dialog open={!!applicationId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{application?.promoterName ?? '—'}</DialogTitle>
          <DialogDescription>
            {application ? (
              <>
                {application.city} · Solicitado por{' '}
                {application.applicant?.name ?? application.applicant?.email ?? '—'}
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !application ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <PromoterApplicationDetail application={application} onClose={onClose} hideHeader />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PromoterApplicationsTable({ data }: { data: PaginatedPromoterApplications }) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  if (data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-[22px] border border-white/14 bg-white/[0.05] py-10 text-center sm:py-16">
        <Inbox className="size-8 text-muted-foreground/60" />
        <p className="font-medium">Sin solicitudes</p>
        <p className="text-sm text-muted-foreground">
          Cuando un organizador aplique va a aparecer aquí.
        </p>
      </div>
    );
  }

  return (
    <>
      <PromoterApplicationModal applicationId={activeId} onClose={() => setActiveId(null)} />

      <div className="overflow-x-auto rounded-[22px] border border-white/14 bg-white/[0.05]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/12 bg-white/[0.035] text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Organizador</th>
              <th className="px-4 py-3 font-medium">Solicitante</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Ciudad</th>
              <th className="px-4 py-3 font-medium">Enviada</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((app) => (
              <tr
                key={app.id}
                className="cursor-pointer border-b border-white/10 transition-colors last:border-b-0 hover:bg-white/[0.08]"
                onClick={() => setActiveId(app.id)}
              >
                <td className="px-4 py-3 font-medium">{app.promoterName}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {app.applicant?.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {app.applicant?.email ?? '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{app.city}</td>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(app.createdAt)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={app.status} />
                </td>
                <td className="px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground"
                    title="Ver detalle"
                    onClick={() => setActiveId(app.id)}
                  >
                    <Eye className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
