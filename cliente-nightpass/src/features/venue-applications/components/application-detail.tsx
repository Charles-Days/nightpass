'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Textarea } from '@/core/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/components/ui/card';
import { paths } from '@/core/config/paths';
import type { ApproveResponse, VenueApplication } from '@/core/types/api';
import { useApproveApplication } from '../hooks/use-approve';
import { useRejectApplication } from '../hooks/use-reject';
import { StatusBadge } from './status-badge';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
}

interface Props {
  application: VenueApplication;
  onClose?: () => void;
  hideHeader?: boolean;
}

export function ApplicationDetail({ application, onClose, hideHeader = false }: Props) {
  const router = useRouter();
  const [showReject, setShowReject] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [approvalResult, setApprovalResult] = React.useState<ApproveResponse | null>(null);

  const approve = useApproveApplication({
    onSuccess: (data) => setApprovalResult(data),
  });
  const reject = useRejectApplication({
    onSuccess: onClose, // el hook ya llama router.refresh() internamente
  });

  const isPending = application.status === 'PENDING';
  const isMutating = approve.isPending || reject.isPending;

  if (approvalResult) {
    return (
      <ApprovalSuccess
        result={approvalResult}
        applicantEmail={application.applicant?.email ?? ''}
        onBack={() => {
          if (onClose) onClose();
          else router.replace(paths.adminApplications);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-bold tracking-tight">
              {application.venueName}
            </h1>
            <p className="text-sm text-muted-foreground">{application.city}</p>
          </div>
          <StatusBadge status={application.status} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del local</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <Field label="Nombre" value={application.venueName} />
          <Field label="Ciudad" value={application.city} />
          <Field label="Dirección" value={application.address ?? '—'} />
          <Field label="Teléfono" value={application.phone ?? '—'} />
          {application.message ? (
            <Field
              label="Mensaje"
              value={application.message}
              className="md:col-span-2 whitespace-pre-wrap"
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Solicitante</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <Field label="Nombre" value={application.applicant?.name ?? '—'} />
          <Field label="Email" value={application.applicant?.email ?? '—'} />
          <Field label="Enviada" value={fmtDate(application.createdAt)} />
          {application.reviewedAt ? (
            <Field label="Revisada" value={fmtDate(application.reviewedAt)} />
          ) : null}
        </CardContent>
      </Card>

      {application.status === 'REJECTED' && application.rejectionReason ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive">Motivo del rechazo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap text-muted-foreground">
            {application.rejectionReason}
          </CardContent>
        </Card>
      ) : null}

      {isPending ? (
        <div className="flex flex-col gap-3 border-t pt-6 md:flex-row md:items-center md:justify-end">
          {showReject ? (
            <div className="flex w-full flex-col gap-3 md:flex-row md:items-start">
              <Textarea
                rows={3}
                placeholder="Motivo del rechazo (opcional, lo verá el solicitante)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isMutating}
                maxLength={500}
                className="md:flex-1"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowReject(false);
                    setReason('');
                  }}
                  disabled={isMutating}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => reject.mutate({ id: application.id, reason })}
                  disabled={isMutating}
                >
                  {reject.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Confirmar rechazo
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowReject(true)}
                disabled={isMutating}
              >
                Rechazar
              </Button>
              <Button
                type="button"
                onClick={() => approve.mutate(application.id)}
                disabled={isMutating}
              >
                {approve.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Aprobar
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ApprovalSuccess({
  result,
  applicantEmail,
  onBack,
}: {
  result: ApproveResponse;
  applicantEmail: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary">
        <CheckCircle2 className="size-8" />
      </div>

      <div className="space-y-1">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          {result.venueName} aprobado
        </h2>
        <p className="text-sm text-muted-foreground">
          Le enviamos las credenciales de acceso a{' '}
          <span className="font-medium text-foreground">{applicantEmail}</span>.
        </p>
      </div>

      <Button type="button" variant="outline" onClick={onBack}>
        <ArrowLeft className="size-4" />
        Volver a la lista
      </Button>
    </div>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground/80">{label}</p>
      <p className="mt-1 text-foreground">{value}</p>
    </div>
  );
}
