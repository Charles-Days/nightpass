'use client';

import * as React from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/core/components/ui/dialog';
import { Button } from '@/core/components/ui/button';

interface Props {
  rpCode: string;
  events: { eventId: string; eventName: string }[];
}

function CopyRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiado');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <div className="rounded-xl border border-white/12 bg-white/[0.03] p-3">
      <p className="truncate text-sm font-semibold">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-black/30 px-2 py-1.5 text-[11px] text-white/60">
          {url}
        </code>
        <Button
          type="button"
          size="sm"
          onClick={copy}
          className="shrink-0 rounded-lg bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
    </div>
  );
}

/**
 * Botón + diálogo con los links de referido del RP para vender en línea.
 * La venta se le acredita a quien abra su link (código guardado 7 días).
 */
export function RpReferralDialog({ rpCode, events }: Props) {
  const [origin, setOrigin] = React.useState('');
  React.useEffect(() => setOrigin(window.location.origin), []);

  const generalUrl = `${origin}/app/eventos?ref=${rpCode}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-full border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
        >
          <Link2 className="size-4" />
          Tu link para vender
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-5 text-primary" />
            Tu link para vender en línea
          </DialogTitle>
          <DialogDescription>
            Comparte tu link. Quien lo abra y compre te acredita la venta
            automáticamente (se guarda 7 días en su dispositivo).
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto py-1">
          <CopyRow label="Todos los eventos" url={generalUrl} />
          {events.length > 0 && (
            <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Por evento
            </p>
          )}
          {events.map((e) => (
            <CopyRow
              key={e.eventId}
              label={e.eventName}
              url={`${origin}/app/evento/${e.eventId}?ref=${rpCode}`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
