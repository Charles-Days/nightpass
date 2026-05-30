import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, CheckCircle2, Clock, Loader2, QrCode, Ticket, Check, X } from 'lucide-react';
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

  const rpResolveQ = useResolveRpCode(debouncedRpCode, !!debouncedRpCode);

  const tiersQ = useEventTiers(eventId);
  const generate = useAdminGeneratePass();

  const reset = () => {
    if (!propEventId) {
      setEventId(null);
    }
    setIssued(null);
    setRpCode('');
    setDebouncedRpCode('');
    generate.reset();
  };

  const onPickTier = async (tierId: string) => {
    if (!eventId) return;
    try {
      const res = await generate.mutateAsync({
        eventId,
        tierId,
        rpCode: rpCode.trim() ? rpCode.trim() : undefined,
      });
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

      <DialogContent className="max-w-md bg-neutral-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-white to-purple-400 bg-clip-text text-transparent">
            Generar vale en efectivo (Admin)
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Genera un QR de venta en efectivo. Al escanearse se asignará el pase y reservará aforo inmediatamente.
          </DialogDescription>
        </DialogHeader>

        {issued ? (
          <SuccessView issued={issued} onAnother={reset} />
        ) : (
          <div className="space-y-4">
            {/* Campo Opcional de Código de RP */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">
                Código del RP (Opcional)
              </label>
              <div className="relative">
                <Input
                  placeholder="Ej. JOSEXO-3605"
                  value={rpCode}
                  onChange={(e) => setRpCode(e.target.value)}
                  className="bg-neutral-800 border-white/10 text-white pr-10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl"
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

            <div className="border-t border-white/5 pt-3">
              {tiersQ.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-purple-500" />
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-neutral-300">Elige el tier para generar el vale</p>
                  {(tiersQ.data?.tiers ?? []).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={generate.isPending}
                      onClick={() => onPickTier(t.id)}
                      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5 text-left text-sm text-white transition hover:border-purple-500/40 hover:bg-white/[0.05] disabled:opacity-50"
                    >
                      <span className="font-semibold">{t.name}</span>
                      <span className="font-display font-bold text-purple-400">{money(t.priceCents)}</span>
                    </button>
                  ))}
                  {generate.isPending && (
                    <div className="flex items-center justify-center gap-2 pt-2 text-xs text-neutral-400">
                      <Loader2 className="size-4 animate-spin text-purple-500" /> Generando QR de vale…
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

function SuccessView({ issued, onAnother }: { issued: IssuedPass; onAnother: () => void }) {
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
          {issued.event.title} · {money(issued.amountCents)}
        </p>
      </div>
      {issued.issuedByRp && (
        <p className="text-xs text-emerald-400 font-medium">
          Asignado al RP: {issued.issuedByRp.displayName} ({issued.issuedByRp.rpCode})
        </p>
      )}
      <p className="flex items-center justify-center gap-1.5 text-xs text-amber-400">
        <Clock className="size-3.5" /> Válido hasta {expires}
      </p>
      <p className="flex items-center justify-center gap-1.5 text-xs text-emerald-400">
        <CheckCircle2 className="size-3.5" /> El cliente lo escanea desde “Mis pases → Escanear”.
      </p>
      <Button onClick={onAnother} variant="outline" className="w-full rounded-full border-white/10 hover:bg-neutral-800 text-white hover:text-white mt-2">
        Emitir otro
      </Button>
    </div>
  );
}
