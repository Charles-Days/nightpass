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
import type { PaginatedApplications } from '@/core/types/api';
import { useApplication } from '../hooks/use-application';
import { ApplicationDetail } from './application-detail';
import { StatusBadge } from './status-badge';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
}

function ApplicationModal({
  applicationId,
  onClose,
}: {
  applicationId: string | null;
  onClose: () => void;
}) {
  const { data: application, isLoading } = useApplication(applicationId);

  return (
    <Dialog open={!!applicationId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {application?.venueName ?? '—'}
          </DialogTitle>
          <DialogDescription>
            {application ? (
              <>
                {application.city} · Solicitado por {application.applicant?.name ?? application.applicant?.email ?? '—'}
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !application ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ApplicationDetail
            application={application}
            onClose={onClose}
            hideHeader
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ApplicationsTable({ data }: { data: PaginatedApplications }) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  if (data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.025] py-16 text-center">
        <Inbox className="size-8 text-muted-foreground/60" />
        <p className="font-medium">Sin solicitudes</p>
        <p className="text-sm text-muted-foreground">
          Cuando un local aplique va a aparecer aquí.
        </p>
      </div>
    );
  }

  return (
    <>
      <ApplicationModal applicationId={activeId} onClose={() => setActiveId(null)} />

      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/8 bg-white/[0.02] text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Local</th>
              <th className="px-4 py-3 font-medium">Ciudad</th>
              <th className="px-4 py-3 font-medium">Solicitante</th>
              <th className="px-4 py-3 font-medium">Enviada</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((app) => (
              <tr
                key={app.id}
                className="cursor-pointer border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.05]"
                onClick={() => setActiveId(app.id)}
              >
                <td className="px-4 py-3 font-medium">{app.venueName}</td>
                <td className="px-4 py-3 text-muted-foreground">{app.city}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {app.applicant?.email ?? '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(app.createdAt)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={app.status} />
                </td>
                <td
                  className="px-2 py-2 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0 text-muted-foreground hover:text-foreground"
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
