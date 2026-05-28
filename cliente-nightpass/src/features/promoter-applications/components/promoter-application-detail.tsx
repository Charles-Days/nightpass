'use client';

import * as React from 'react';
import { CheckCircle2, Instagram, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import { Textarea } from '@/core/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/components/ui/card';
import { Badge } from '@/core/components/ui/badge';
import type { PromoterApplication, PromoterExperience } from '@/core/types/api';
import { useApprovePromoterApplication } from '../hooks/use-approve-promoter';
import { useRejectPromoterApplication } from '../hooks/use-reject-promoter';
import { StatusBadge } from '@/features/venue-applications/components/status-badge';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
}

const EXPERIENCE_LABEL: Record<PromoterExperience, string> = {
  '0': 'Sin experiencia',
  '1-5': '1 a 5 eventos',
  '6-20': '6 a 20 eventos',
  '20+': 'Mas de 20 eventos',
};

interface Props {
  application: PromoterApplication;
  onClose?: () => void;
  hideHeader?: boolean;
}

export function PromoterApplicationDetail({ application, onClose, hideHeader = false }: Props) {
  const [showReject, setShowReject] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [approved, setApproved] = React.useState(false);

  const approve = useApprovePromoterApplication({
    onSuccess: () => setApproved(true),
  });
  const reject = useRejectPromoterApplication({
    onSuccess: onClose,
  });

  const isPending = application.status === 'PENDING';
  const isMutating = approve.isPending || reject.isPending;

  if (approved) {
    return (
      <ApprovalSuccess
        promoterName={application.promoterName}
        applicantEmail={application.applicant?.email ?? ''}
        onBack={() => onClose?.()}
      />
    );
  }

  const instagramUrl = application.instagram
    ? application.instagram.startsWith('http')
      ? application.instagram
      : `https://instagram.com/${application.instagram.replace(/^@/, '')}`
    : null;

  const websiteUrl = application.website
    ? application.website.startsWith('http')
      ? application.website
      : `https://${application.website}`
    : null;

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {application.promoterName}
            </h1>
            <p className="text-sm text-muted-foreground">{application.city}</p>
          </div>
          <StatusBadge status={application.status} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de la promotora</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <Field label="Nombre" value={application.promoterName} />
          <Field label="Ciudad" value={application.city} />
          <Field label="Telefono" value={application.phone ?? '—'} />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Experiencia</p>
            <div className="mt-1">
              <Badge variant="secondary">{EXPERIENCE_LABEL[application.experience]}</Badge>
            </div>
          </div>
          {application.eventTypes.length > 0 ? (
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                Tipos de evento
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {application.eventTypes.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          {instagramUrl || websiteUrl ? (
            <div className="md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Redes</p>
              <div className="mt-1 flex flex-wrap gap-3 text-sm">
                {instagramUrl ? (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Instagram className="size-4" />
                    {application.instagram}
                  </a>
                ) : null}
                {websiteUrl ? (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Globe className="size-4" />
                    {application.website}
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
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
          {application.reviewer ? (
            <Field
              label="Revisor"
              value={application.reviewer.name ?? application.reviewer.email}
              className="md:col-span-2"
            />
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
  promoterName,
  applicantEmail,
  onBack,
}: {
  promoterName: string;
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
          {promoterName} aprobada
        </h2>
        <p className="text-sm text-muted-foreground">
          Solicitud aprobada. Las credenciales fueron enviadas al promotor por email
          {applicantEmail ? (
            <>
              {' '}
              (<span className="font-medium text-foreground">{applicantEmail}</span>)
            </>
          ) : null}
          .
        </p>
      </div>

      <Button type="button" onClick={onBack}>
        Cerrar
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
