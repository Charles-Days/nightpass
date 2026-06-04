import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  Clock,
  Copy,
  Gift,
  Loader2,
  QrCode,
  Check,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/core/components/ui/dialog';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { ClientApiError } from '@/core/lib/api/client-client';
import { clientEnv } from '@/core/config/env';
import { useEventTiers } from '@/features/rp/hooks/use-rp';
import { useAdminGeneratePass, useResolveRpCode, type IssuedPass } from '../hooks/use-admin-passes';

const money = (cents: number) => `$${(cents / 100).toFixed(2)} MXN`;

function errMessage(error: unknown): string {
  if (error instanceof ClientApiError) {
    const p = error.payload as { message?: string | string[] } | null;
    const m = p?.message;
    if (Array.isArray(m)) return m[0] ?? 'No se pudo generar el vale';
    if (typeof m === 'string') return m;
  }
  return 'No se pudo generar el vale';
}

interface Props {
  eventId?: string;
  eventName?: string;
  trigger?: React.ReactNode;
}

export function GeneratePassDialog({ eventId: propEventId, eventName: propEventName, trigger }: Props) {
  const [open, setOpen] = React.useState(false);
  const [eventId, setEventId] = React.useState<string | null>(null);
  const [issued, setIssued] = React.useState<IssuedPass | null>(null);

  // Cortesía (gratis): cuando ON, no aplica código de RP ni precio.
  const [comp, setComp] = React.useState(false);

  // Campo de código RP
  const [rpCode, setRpCode] = React.useState('');
  const [debouncedRpCode, setDebouncedRpCode] = React.useState('');

  // Sincronizar el prop
  React.useEffect(() => {
    if (propEventId) {
      setEventId(propEventId);
    }
  }, [propEventId]);

  // Debounce para validar código de RP
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedRpCode(rpCode.trim());
    }, 500);
    return () => clearTimeout(handler);
  }, [rpCode]);

  const rpResolveQ = useResolveRpCode(debouncedRpCode, !comp && !!debouncedRpCode);

  const tiersQ = useEventTiers(eventId);
  const generate = useAdminGeneratePass();

  const reset = () => {
    if (!propEventId) {
      setEventId(null);
    }
    setIssued(null);
    setComp(false);
    setRpCode('');
    setDebouncedRpCode('');
    generate.reset();
  };

  const onPickTier = async (tierId: string) => {
    if (!eventId) return;
    try {
      const res = await generate.mutateAsync(
        comp
          ? { eventId, tierId, comp: true }
          : {
              eventId,
              tierId,
              rpCode: rpCode.trim() ? rpCode.trim() : undefined,
            },
      );
      setIssued(res);
    } catch {
      /* el error se muestra en pantalla */
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
        {trigger || (
          <Button className="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_4px_18px_-4px_rgba(124,58,237,0.5)]">
            <QrCode className="mr-1.5 size-4" />
            Generar vale en efectivo
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md bg-neutral-900 border-white/14 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
            {comp ? 'Generar boleto de cortesía' : 'Generar vale en efectivo'} (Admin)
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            {comp
              ? 'Genera un boleto gratis y compártelo por link. El primero que lo reclame se queda con el pase.'
              : 'Genera un QR de venta en efectivo. Al escanearse se asignará el pase y reservará aforo inmediatamente.'}
          </DialogDescription>
        </DialogHeader>

        {issued ? (
          <SuccessView issued={issued} comp={comp} onAnother={reset} />
        ) : (
          <div className="space-y-4">
            {/* Toggle Cortesía (gratis) */}
            <button
              type="button"
              role="switch"
              aria-checked={comp}
              disabled={generate.isPending}
              onClick={() => setComp((v) => !v)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition disabled:opacity-50 ${
                comp
                  ? 'border-emerald-400/40 bg-emerald-400/10'
                  : 'border-white/14 bg-white/[0.035] hover:bg-white/[0.08]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Gift
                  className={`size-4 ${comp ? 'text-emerald-400' : 'text-neutral-400'}`}
                />
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-white">
                    Cortesía (gratis)
                  </span>
                  <span className="text-xs text-neutral-400">
                    Regala el boleto por link, sin cobro.
                  </span>
                </span>
              </span>
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  comp ? 'bg-emerald-500' : 'bg-neutral-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${
                    comp ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </span>
            </button>

            {/* Campo Opcional de Código de RP — solo en vale en efectivo */}
            {!comp && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Código del RP (Opcional)
                </label>
                <div className="relative">
                  <Input
                    placeholder="Ej. JOSEXO-3605"
                    value={rpCode}
                    onChange={(e) => setRpCode(e.target.value)}
                    className="bg-neutral-800 border-white/14 text-white pr-10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl"
                    disabled={generate.isPending}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                    {rpResolveQ.isFetching ? (
                      <Loader2 className="size-4 animate-spin text-purple-400" />
                    ) : rpResolveQ.data ? (
                      <Check className="size-4 text-emerald-400" />
                    ) : debouncedRpCode && rpResolveQ.isError ? (
                      <X className="size-4 text-rose-400" />
                    ) : null}
                  </div>
                </div>
                {rpResolveQ.data && (
                  <p className="text-xs text-emerald-400 font-medium">
                    Comisión atribuida a: <span className="underline">{rpResolveQ.data.displayName}</span>
                  </p>
                )}
                {debouncedRpCode && rpResolveQ.isError && (
                  <p className="text-xs text-rose-400 font-medium">
                    Advertencia: El código de RP no es válido o está inactivo. No se acreditará comisión a ningún RP.
                  </p>
                )}
              </div>
            )}

            <div className="border-t border-white/10 pt-3">
              {tiersQ.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-purple-500" />
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-neutral-300">
                    {comp
                      ? 'Elige el tier para el boleto de cortesía'
                      : 'Elige el tier para generar el vale'}
                  </p>
                  {(tiersQ.data?.tiers ?? []).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={generate.isPending}
                      onClick={() => onPickTier(t.id)}
                      className="flex w-full items-center justify-between rounded-xl border border-white/14 bg-white/[0.035] px-4 py-3.5 text-left text-sm text-white transition hover:border-purple-500/40 hover:bg-white/[0.08] disabled:opacity-50"
                    >
                      <span className="font-semibold">{t.name}</span>
                      {comp ? (
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-neutral-500 line-through">
                            {money(t.priceCents)}
                          </span>
                          <span className="font-display font-bold text-emerald-400">
                            Gratis
                          </span>
                        </span>
                      ) : (
                        <span className="font-display font-bold text-purple-400">
                          {money(t.priceCents)}
                        </span>
                      )}
                    </button>
                  ))}
                  {generate.isPending && (
                    <div className="flex items-center justify-center gap-2 pt-2 text-xs text-neutral-400">
                      <Loader2 className="size-4 animate-spin text-purple-500" />{' '}
                      {comp ? 'Generando boleto de cortesía…' : 'Generando QR de vale…'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {generate.isError && (
              <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {errMessage(generate.error)}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SuccessView({
  issued,
  comp,
  onAnother,
}: {
  issued: IssuedPass;
  comp: boolean;
  onAnother: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const claimLink = `${clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/app/reclamar-vale/${issued.token}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(claimLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard no disponible */
    }
  };

  const expires = new Date(issued.expiresAt).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto w-full max-w-[240px] rounded-[20px] bg-white p-4 shadow-[0_20px_60px_-10px_rgba(168,85,247,0.4)]">
        <QRCodeSVG value={issued.token} level="H" marginSize={2} fgColor="#0A0A0F" bgColor="#FFFFFF" className="size-full" />
      </div>
      <div>
        <p className="font-display text-lg font-bold text-white">{issued.tier.name}</p>
        <p className="text-sm text-neutral-400">
          {issued.event.title} ·{' '}
          {comp || issued.amountCents === 0 ? (
            <span className="font-semibold text-emerald-400">Cortesía · Gratis</span>
          ) : (
            money(issued.amountCents)
          )}
        </p>
      </div>
      {issued.issuedByRp && (
        <p className="text-xs text-emerald-400 font-medium">
          Asignado al RP: {issued.issuedByRp.displayName} ({issued.issuedByRp.rpCode})
        </p>
      )}

      {/* Link para regalar (un solo uso) */}
      <div
        className={`rounded-[16px] border p-3 text-left ${
          comp
            ? 'border-emerald-400/30 bg-emerald-400/10'
            : 'border-white/14 bg-white/[0.035]'
        }`}
      >
        <p className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <Gift className="size-3.5 text-emerald-400" />
          {comp ? 'Comparte este link para regalar el boleto' : 'O comparte el link para regalarlo'}
        </p>
        <p className="mt-1 break-all text-[11px] text-neutral-400">{claimLink}</p>
        <Button
          onClick={onCopy}
          variant="outline"
          className="mt-2.5 w-full rounded-full border-white/14 text-white hover:bg-neutral-800 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="mr-1.5 size-4 text-emerald-400" /> Copiado
            </>
          ) : (
            <>
              <Copy className="mr-1.5 size-4" /> Copiar link
            </>
          )}
        </Button>
        <p className="mt-2 text-[11px] text-neutral-500">
          Comparte este link para regalar el boleto (un solo uso).
        </p>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-amber-400">
        <Clock className="size-3.5" /> Válido hasta {expires}
      </p>
      {!comp && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-emerald-400">
          <CheckCircle2 className="size-3.5" /> El cliente lo escanea desde “Mis pases → Escanear”.
        </p>
      )}
      <Button onClick={onAnother} variant="outline" className="w-full rounded-full border-white/14 hover:bg-neutral-800 text-white hover:text-white mt-2">
        Emitir otro
      </Button>
    </div>
  );
}
