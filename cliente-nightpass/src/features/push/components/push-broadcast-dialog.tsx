'use client';

import * as React from 'react';
import { Loader2, Megaphone, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/core/components/ui/dialog';
import { Button } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Textarea } from '@/core/components/ui/textarea';
import { Label } from '@/core/components/ui/label';
import { clientFetch } from '@/core/lib/api/client-client';

interface BroadcastResult {
  ok: boolean;
  subscriptions: number;
  delivered: number;
}

/**
 * Difusión de una notificación push a TODOS los suscriptores (solo ADMIN).
 * Pega contra POST /api/push/broadcast → backend /push/broadcast.
 */
export function PushBroadcastDialog() {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [sending, setSending] = React.useState(false);

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !sending;

  const onSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const res = await clientFetch<BroadcastResult>('/api/push/broadcast', {
        method: 'POST',
        body: {
          title: title.trim(),
          body: body.trim(),
          ...(url.trim() ? { url: url.trim() } : {}),
        },
      });
      toast.success(
        `Enviada a ${res.delivered}/${res.subscriptions} dispositivo${res.subscriptions === 1 ? '' : 's'}`,
      );
      setOpen(false);
      setTitle('');
      setBody('');
      setUrl('');
    } catch {
      toast.error('No se pudo enviar la difusión');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-xl border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
        >
          <Megaphone className="size-4" />
          Enviar a todos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="size-5 text-primary" />
            Notificación a todos
          </DialogTitle>
          <DialogDescription>
            Se envía a todos los dispositivos suscritos (clientes y staff). Úsalo
            con criterio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="bc-title">Título</Label>
            <Input
              id="bc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Ej. ¡Nuevo evento este viernes!"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bc-body">Mensaje</Label>
            <Textarea
              id="bc-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={180}
              rows={3}
              placeholder="Lo que verán en la notificación…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bc-url">Link al tocar (opcional)</Label>
            <Input
              id="bc-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/app/eventos"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            className="rounded-xl bg-gradient-to-r from-[#9333ea] to-[#a855f7] text-white"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Enviar a todos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
