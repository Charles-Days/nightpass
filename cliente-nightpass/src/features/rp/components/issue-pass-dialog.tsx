'use client';

import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, CheckCircle2, Clock, Link as LinkIcon, Loader2, QrCode, Ticket } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/core/components/ui/dialog';
import { Button } from '@/core/components/ui/button';
import { ClientApiError } from '@/core/lib/api/client-client';
import { paths } from '@/core/config/paths';
import { useEventTiers, useIssueRpPass, type IssuedPass } from '../hooks/use-rp';

const money = (cents: number) => `$${(cents / 100).toFixed(2)} MXN`;

function errMessage(error: unknown): string {
  if (error instanceof ClientApiError) {
    const p = error.payload as { message?: string | string[] } | null;
    const m = p?.message;
    if (Array.isArray(m)) return m[0] ?? 'No se pudo emitir el pase';
    if (typeof m === 'string') return m;
  }
  return 'No se pudo emitir el pase';
}

interface Props {
  events: { eventId: string; eventName: string }[];
}

export function IssuePassDialog({ events }: Props) {
  const [open, setOpen] = React.useState(false);
  const [eventId, setEventId] = React.useState<string | null>(null);
  const [issued, setIssued] = React.useState<IssuedPass | null>(null);

  const tiersQ = useEventTiers(eventId);
  const issue = useIssueRpPass();
  const selectedEvent = events.find((e) => e.eventId === eventId) ?? null;

  const reset = () => {
    setEventId(null);
    setIssued(null);
    issue.reset();
  };

  const onPickTier = async (tierId: string) => {
    if (!eventId) return;
    try {
      const res = await issue.mutateAsync({ eventId, tierId });
      setIssued(res);
    } catch {
      /* el error se muestra desde issue.error */
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="rounded-full bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white shadow-[0_4px_18px_-4px_rgba(168,85,247,0.55)]">
          <QrCode className="mr-1.5 size-4" />
          Generar pase
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Emitir pase (efectivo)</DialogTitle>
          <DialogDescription>
            Genera un QR (o link). El cliente lo escanea con cualquier cámara, se
            registra y el boleto se le guarda al instante; la venta cuenta para tu
            comisión.
          </DialogDescription>
        </DialogHeader>

        {issued ? (
          <SuccessView issued={issued} onAnother={reset} />
        ) : !eventId ? (
          events.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No tienes eventos activos asignados.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Elige el evento</p>
              {events.map((e) => (
                <button
                  key={e.eventId}
                  type="button"
                  onClick={() => setEventId(e.eventId)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/14 bg-white/[0.05] px-4 py-3 text-left text-sm font-medium text-white transition hover:border-primary/40 hover:bg-white/[0.09]"
                >
                  {e.eventName}
                  <Ticket className="size-4 text-primary" />
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setEventId(null)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> {selectedEvent?.eventName}
            </button>

            {tiersQ.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Elige el tier (precio)</p>
                {(tiersQ.data?.tiers ?? []).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={issue.isPending}
                    onClick={() => onPickTier(t.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-white/14 bg-white/[0.05] px-4 py-3 text-left text-sm text-white transition hover:border-primary/40 hover:bg-white/[0.09] disabled:opacity-50"
                  >
                    <span className="font-semibold">{t.name}</span>
                    <span className="font-display font-bold text-primary">{money(t.priceCents)}</span>
                  </button>
                ))}
                {issue.isPending && (
                  <div className="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Generando QR…
                  </div>
                )}
              </div>
            )}

            {issue.isError && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {errMessage(issue.error)}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SuccessView({ issued, onAnother }: { issued: IssuedPass; onAnother: () => void }) {
  const expires = new Date(issued.expiresAt).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  // El QR codifica una URL pública: cualquier cámara la abre → la persona se
  // registra (o entra) y el boleto se le guarda. No es el token crudo.
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const claimUrl = `${origin}${paths.reclamarVale}/${issued.token}`;
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto w-full max-w-[240px] rounded-[20px] bg-white p-4 shadow-[0_20px_60px_-10px_rgba(168,85,247,0.4)]">
        <QRCodeSVG value={claimUrl} level="H" marginSize={2} fgColor="#0A0A0F" bgColor="#FFFFFF" className="size-full" />
      </div>
      <div>
        <p className="font-display text-lg font-bold text-white">{issued.tier.name}</p>
        <p className="text-sm text-muted-foreground">
          {issued.event.title} · {money(issued.amountCents)}
        </p>
      </div>
      <p className="flex items-center justify-center gap-1.5 text-xs text-amber-300">
        <Clock className="size-3.5" /> Válido hasta {expires}
      </p>
      <p className="flex items-center justify-center gap-1.5 text-xs text-emerald-300">
        <CheckCircle2 className="size-3.5" /> Cualquier cámara lo escanea → se registra y el boleto se guarda.
      </p>
      <CopyLinkButton url={claimUrl} />
      <Button onClick={onAnother} variant="outline" className="w-full rounded-full">
        Emitir otro
      </Button>
    </div>
  );
}

/** Copia el link del vale (útil para enviarlo por WhatsApp en vez del QR). */
function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* sin clipboard: no-op */
    }
  };
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={copy}
      className="w-full rounded-full text-xs"
    >
      <LinkIcon className="mr-1.5 size-3.5" />
      {copied ? 'Link copiado' : 'Copiar link del vale'}
    </Button>
  );
}
