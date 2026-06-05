'use client';

import * as React from 'react';
import { BellRing, Loader2, MapPin, QrCode, Users } from 'lucide-react';
import { toast } from 'sonner';
import { clientFetch } from '@/core/lib/api/client-client';
import { CollapsibleCard } from '@/core/components/ui/collapsible-card';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Textarea } from '@/core/components/ui/textarea';
import { Label } from '@/core/components/ui/label';
import { cn } from '@/core/lib/utils/cn';

type Audience = 'BOTH' | 'GEO' | 'CHECKIN';

interface NotifyResult {
  ok: boolean;
  present: number;
  eligible: number;
  targeted: number;
  delivered: number;
}

const AUDIENCE_OPTS: { key: Audience; label: string; icon: React.ElementType; hint: string }[] = [
  { key: 'BOTH', label: 'Ambos', icon: Users, hint: 'Cerca del local o que escanearon su pase' },
  { key: 'GEO', label: 'Por ubicación', icon: MapPin, hint: 'Quienes están cerca del local ahora' },
  { key: 'CHECKIN', label: 'Por check-in', icon: QrCode, hint: 'Quienes escanearon su pase' },
];

/**
 * Notificación dirigida a una muestra ALEATORIA de presentes en el evento.
 * Admin escribe el mensaje, elige la audiencia y el tope de personas.
 */
export function EventNotifyCard({ eventId }: { eventId: string }) {
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [audience, setAudience] = React.useState<Audience>('BOTH');
  const [max, setMax] = React.useState(10);
  const [sending, setSending] = React.useState(false);

  const canSend =
    title.trim().length > 0 && body.trim().length > 0 && max >= 1 && !sending;

  const onSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const res = await clientFetch<NotifyResult>(`/api/push/event/${eventId}`, {
        method: 'POST',
        body: { title: title.trim(), body: body.trim(), audience, max },
      });
      if (res.present === 0) {
        toast.warning('No detectamos a nadie en el evento ahora mismo.');
      } else if (res.eligible === 0) {
        toast.warning(
          `${res.present} presentes, pero ninguno tiene notificaciones activadas.`,
        );
      } else {
        toast.success(
          `Enviada a ${res.delivered} de ${res.present} presentes (${res.eligible} con push).`,
        );
        setTitle('');
        setBody('');
      }
    } catch {
      toast.error('No se pudo enviar la notificación');
    } finally {
      setSending(false);
    }
  };

  return (
    <CollapsibleCard
      icon={<BellRing className="size-4 text-primary" />}
      title="Notificar a presentes"
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Manda una notificación a una muestra <strong>aleatoria</strong> de
          quienes creemos están en el evento ahora. Tú pones el tope: si pones
          10, le llega a 10 al azar.
        </p>

        <div className="space-y-1.5">
          <Label>¿A quién?</Label>
          <div className="grid grid-cols-3 gap-2">
            {AUDIENCE_OPTS.map((opt) => {
              const Icon = opt.icon;
              const active = audience === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setAudience(opt.key)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-medium transition',
                    active
                      ? 'border-primary/50 bg-primary/15 text-primary'
                      : 'border-white/12 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]',
                  )}
                >
                  <Icon className="size-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {AUDIENCE_OPTS.find((o) => o.key === audience)?.hint}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ev-notify-title">Título</Label>
          <Input
            id="ev-notify-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="Ej. ¡Shot gratis en la barra!"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ev-notify-body">Mensaje</Label>
          <Textarea
            id="ev-notify-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={180}
            rows={2}
            placeholder="Lo que verán en la notificación…"
          />
        </div>

        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ev-notify-max">Máximo de personas</Label>
            <Input
              id="ev-notify-max"
              type="number"
              min={1}
              max={1000}
              value={Number.isNaN(max) ? '' : max}
              onChange={(e) => setMax(Math.floor(e.target.valueAsNumber))}
              className="w-32"
            />
          </div>
          <Button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            className="rounded-xl bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
            Enviar al azar
          </Button>
        </div>
      </div>
    </CollapsibleCard>
  );
}
